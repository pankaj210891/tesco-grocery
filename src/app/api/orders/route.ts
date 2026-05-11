import { checkoutSchema } from "@/lib/validations/checkout";
import { createOrder, type OrderItem } from "@/services/order.service";
import { VALID_PROMOS, FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from "@/lib/constants/promos";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate delivery + payment fields
    const parsed = checkoutSchema.safeParse(body.form);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    // Validate cart items
    const items: OrderItem[] = body.items ?? [];
    if (!items.length) {
      return Response.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    const { fullName, email, phone, address, city, postcode } = parsed.data;

    // Re-compute pricing server-side (never trust client totals)
    const subtotal    = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const promoCode   = (body.promoCode as string | undefined)?.toUpperCase();
    const promoPct    = promoCode ? (VALID_PROMOS[promoCode]?.pct ?? 0) : 0;
    const discount    = subtotal * promoPct;
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
    const total       = subtotal + deliveryFee - discount;

    const result = await createOrder({
      userId:     body.userId,
      items,
      delivery:   { fullName, email, phone, address, city, postcode },
      subtotal,
      deliveryFee,
      discount,
      promoCode:  promoPct > 0 ? promoCode : undefined,
      total,
    });

    return Response.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place order.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
