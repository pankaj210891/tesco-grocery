/**
 * Legacy order creation route — kept for backward compatibility.
 * New payment flows use /api/payments/cod or /api/payments/razorpay/*.
 */
import { checkoutSchema } from "@/lib/validations/checkout";
import { createOrder } from "@/services/order.service";
import { validateCheckoutOrder, firePromoUsage, type CheckoutItem } from "@/lib/checkout/validate-order";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = checkoutSchema.safeParse(body.form);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const rawItems: CheckoutItem[] = body.items ?? [];
    if (!rawItems.length) {
      return Response.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    const { fullName, email, phone, address, city, postcode } = parsed.data;
    const delivery = { fullName, email, phone, address, city, postcode };

    const validated = await validateCheckoutOrder({
      items:     rawItems,
      delivery,
      promoCode: body.promoCode as string | undefined,
      userId:    body.userId   as string | undefined,
    });

    const result = await createOrder({
      userId:        body.userId,
      items:         validated.items,
      delivery:      validated.delivery,
      subtotal:      validated.subtotal,
      deliveryFee:   validated.deliveryFee,
      discount:      validated.discount,
      promoCode:     validated.promoCode,
      total:         validated.total,
      paymentMethod: "cod",
      paymentStatus: "pending",
    });

    await firePromoUsage(
      validated.promoCode,
      validated.promoDocId,
      body.userId as string | undefined,
      result.orderId,
      validated.discount,
    );

    return Response.json({ success: true, data: { ...result, total: validated.total } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place order.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
