import { z } from "zod";
import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { paymentLimiter, applyRateLimit, getClientIp } from "@/lib/ratelimit";
import { validateCheckoutOrder, firePromoUsage } from "@/lib/checkout/validate-order";
import { createOrder } from "@/services/order.service";
import { deductWalletForOrder } from "@/services/wallet.service";
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
  productId:    z.string(),
  variantId:    z.string().nullable().optional(),
  variantLabel: z.string().nullable().optional(),
  name:         z.string(),
  slug:         z.string(),
  price:        z.number().positive(),
  quantity:     z.number().int().positive(),
  image:        z.string(),
  category:     z.string().optional(),
});

const deliverySlotSchema = z.object({
  slotId: z.string(),
  date:   z.string(),
  window: z.string(),
}).optional();

const bodySchema = z.object({
  delivery:     deliverySchema,
  items:        z.array(itemSchema).min(1),
  promoCode:    z.string().optional(),
  userId:       z.string().min(1, "User ID required for wallet payment"),
  deliverySlot: deliverySlotSchema,
});

export async function POST(req: NextRequest) {
  const ip    = getClientIp(req);
  const limit = await applyRateLimit(paymentLimiter, `payment:${ip}`);
  if (limit.limited) {
    return Response.json(
      { success: false, error: "Too many payment requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }
  // Wallet payment requires authentication
  const auth = getAuthUser(req);
  if (!auth) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 422 }
      );
    }

    const { delivery, items, promoCode, userId, deliverySlot } = parsed.data;

    // Guard: authenticated user must match the userId in the body
    if (auth.userId !== userId) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Book delivery slot before touching wallet (capacity check first)
    if (deliverySlot) {
      const slotOk = await bookDeliverySlot(deliverySlot.slotId);
      if (!slotOk) {
        return Response.json(
          { success: false, error: "Selected delivery slot is no longer available. Please choose another." },
          { status: 409 }
        );
      }
    }

    // Server-side total validation
    const validated = await validateCheckoutOrder({
      items,
      delivery,
      promoCode,
      userId,
      paymentMethod: "wallet",
    });

    // Atomically deduct from wallet — throws "Insufficient wallet balance." if low
    // We need to create the order first to get an orderId for the transaction record,
    // but we must deduct wallet atomically. Solution: deduct wallet first, then create
    // order. If order creation fails, we attempt a compensating credit back.

    // Step 1: Deduct wallet (using a temporary order number placeholder)
    const tempRef = `TEMP-${Date.now()}`;
    const { wallet: updatedWallet } = await deductWalletForOrder(
      userId,
      validated.total,
      tempRef,   // will be updated after order is created
      tempRef
    );

    // Step 2: Create the order
    let result;
    try {
      result = await createOrder({
        userId,
        items:              validated.items,
        delivery:           validated.delivery,
        subtotal:           validated.subtotal,
        deliveryFee:        validated.deliveryFee,
        codCharge:          0,
        discount:           validated.discount,
        promoCode:          validated.promoCode,
        total:              validated.total,
        walletAmount:       validated.total,
        paymentMethod:      "wallet",
        paymentStatus:      "paid",
        deliverySlotId:     deliverySlot?.slotId,
        deliverySlotDate:   deliverySlot?.date,
        deliverySlotWindow: deliverySlot?.window,
      });
    } catch (orderErr) {
      // Compensate: refund wallet since order failed
      const { refundToWallet } = await import("@/services/wallet.service");
      await refundToWallet(userId, validated.total, tempRef, tempRef, "Order creation failed — refund");
      throw orderErr;
    }

    await firePromoUsage(
      validated.promoCode,
      validated.promoDocId,
      userId,
      result.orderId,
      validated.discount,
    );

    try {
      await sendOrderConfirmation(delivery.email, {
        orderNumber:     result.orderNumber,
        customerName:    delivery.fullName,
        items:           validated.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total:           validated.total,
        paymentMethod:   "Wallet",
        deliveryAddress: `${delivery.address}, ${delivery.city} – ${delivery.postcode}`,
      });
    } catch (emailErr) {
      console.error("[wallet] Failed to send confirmation email:", emailErr);
    }

    return Response.json({
      success: true,
      data: {
        orderId:       result.orderId,
        orderNumber:   result.orderNumber,
        total:         validated.total,
        walletBalance: updatedWallet.balance,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet payment failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
