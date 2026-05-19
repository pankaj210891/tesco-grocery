import crypto from "crypto";
import { z } from "zod";
import { validateCheckoutOrder, firePromoUsage, fireStockDecrement } from "@/lib/checkout/validate-order";
import { createOrder } from "@/services/order.service";
import { bookDeliverySlot } from "@/services/delivery-slot.service";
import { sendOrderConfirmation } from "@/services/email.service";

const deliverySchema = z.object({
  fullName: z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().length(10).regex(/^\d{10}$/),
  address:  z.string().min(5),
  city:     z.string().min(2),
  postcode: z.string().min(5).max(8),
});

const itemSchema = z.object({
  productId: z.string(),
  name:      z.string(),
  slug:      z.string(),
  price:     z.number().positive(),
  quantity:  z.number().int().positive(),
  image:     z.string(),
  category:  z.string().optional(),
});

const deliverySlotSchema = z.object({
  slotId: z.string(),
  date:   z.string(),
  window: z.string(),
}).optional();

const bodySchema = z.object({
  razorpayOrderId:   z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  delivery:          deliverySchema,
  items:             z.array(itemSchema).min(1),
  promoCode:         z.string().optional(),
  userId:            z.string().optional(),
  deliverySlot:      deliverySlotSchema,
});

export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      delivery,
      items,
      promoCode,
      userId,
      deliverySlot,
    } = parsed.data;

    // ── Verify Razorpay HMAC signature ────────────────────────────────────────
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return Response.json({ success: false, error: "Payment configuration error." }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return Response.json(
        { success: false, error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // ── Book delivery slot (if selected) ─────────────────────────────────────
    if (deliverySlot) {
      const slotOk = await bookDeliverySlot(deliverySlot.slotId);
      if (!slotOk) {
        return Response.json(
          { success: false, error: "Selected delivery slot is no longer available. Please choose another." },
          { status: 409 },
        );
      }
    }

    // ── Re-validate totals server-side ────────────────────────────────────────
    const validated = await validateCheckoutOrder({ items, delivery, promoCode, userId, paymentMethod: "razorpay" });

    // ── Persist order ─────────────────────────────────────────────────────────
    const result = await createOrder({
      userId,
      items:               validated.items,
      delivery:            validated.delivery,
      subtotal:            validated.subtotal,
      deliveryFee:         validated.deliveryFee,
      codCharge:           validated.codCharge,
      discount:            validated.discount,
      promoCode:           validated.promoCode,
      total:               validated.total,
      paymentMethod:       "razorpay",
      paymentStatus:       "paid",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      deliverySlotId:      deliverySlot?.slotId,
      deliverySlotDate:    deliverySlot?.date,
      deliverySlotWindow:  deliverySlot?.window,
    });

    await firePromoUsage(
      validated.promoCode,
      validated.promoDocId,
      userId,
      result.orderId,
      validated.discount,
    );
    void fireStockDecrement(validated.items);

    try {
      await sendOrderConfirmation(delivery.email, {
        orderNumber:     result.orderNumber,
        customerName:    delivery.fullName,
        items:           validated.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total:           validated.total,
        paymentMethod:   "Razorpay",
        deliveryAddress: `${delivery.address}, ${delivery.city} – ${delivery.postcode}`,
      });
      console.log("[razorpay] Order confirmation email sent to", delivery.email);
    } catch (emailErr) {
      console.error("[razorpay] Failed to send order confirmation email:", emailErr);
    }

    return Response.json({
      success: true,
      data: {
        orderId:     result.orderId,
        orderNumber: result.orderNumber,
        total:       validated.total,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment verification failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
