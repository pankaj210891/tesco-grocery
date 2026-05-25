import { z } from "zod";
import { NextRequest } from "next/server";
import { validateCheckoutOrder, firePromoUsage } from "@/lib/checkout/validate-order";
import { paymentLimiter, applyRateLimit, getClientIp } from "@/lib/ratelimit";
import { createOrder } from "@/services/order.service";
import { bookDeliverySlot } from "@/services/delivery-slot.service";
import { enqueueOrderConfirmation } from "@/lib/queue/jobs/email.jobs";
import { enqueueAnalyticsEvent } from "@/lib/queue/jobs/analytics.jobs";

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
  userId:       z.string().optional(),
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
  try {
    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const { delivery, items, promoCode, userId, deliverySlot } = parsed.data;

    // Validate slot capacity before placing order
    if (deliverySlot) {
      const slotOk = await bookDeliverySlot(deliverySlot.slotId);
      if (!slotOk) {
        return Response.json(
          { success: false, error: "Selected delivery slot is no longer available. Please choose another." },
          { status: 409 },
        );
      }
    }

    const validated = await validateCheckoutOrder({
      items,
      delivery,
      promoCode,
      userId,
      paymentMethod: "cod",
    });

    const result = await createOrder({
      userId,
      items:              validated.items,
      delivery:           validated.delivery,
      subtotal:           validated.subtotal,
      deliveryFee:        validated.deliveryFee,
      codCharge:          validated.codCharge,
      discount:           validated.discount,
      promoCode:          validated.promoCode,
      total:              validated.total,
      paymentMethod:      "cod",
      paymentStatus:      "pending",
      deliverySlotId:     deliverySlot?.slotId,
      deliverySlotDate:   deliverySlot?.date,
      deliverySlotWindow: deliverySlot?.window,
    });

    await firePromoUsage(
      validated.promoCode,
      validated.promoDocId,
      userId,
      result.orderId,
      validated.discount,
    );

    void enqueueOrderConfirmation(delivery.email, {
      orderNumber:     result.orderNumber,
      customerName:    delivery.fullName,
      items:           validated.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      total:           validated.total,
      paymentMethod:   "Cash on Delivery",
      deliveryAddress: `${delivery.address}, ${delivery.city} – ${delivery.postcode}`,
    });

    void enqueueAnalyticsEvent("order.created", {
      orderNumber:   result.orderNumber,
      paymentMethod: "cod",
      total:         validated.total,
      itemCount:     validated.items.length,
    }, userId);

    return Response.json({
      success: true,
      data: {
        orderId:     result.orderId,
        orderNumber: result.orderNumber,
        total:       validated.total,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place order.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
