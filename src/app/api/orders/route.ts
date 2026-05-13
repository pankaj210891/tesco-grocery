import { checkoutSchema } from "@/lib/validations/checkout";
import { createOrder, type OrderItem } from "@/services/order.service";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from "@/lib/constants/promos";
import { applyPromo, recordPromoUsage } from "@/services/promo.service";
import Offer from "@/lib/db/models/offer.model";
import { connectDB } from "@/lib/db/mongoose";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Validate delivery + payment form fields ────────────────────────────
    const parsed = checkoutSchema.safeParse(body.form);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    // ── Validate cart items ────────────────────────────────────────────────
    const items: (OrderItem & { category?: string })[] = body.items ?? [];
    if (!items.length) {
      return Response.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    const { fullName, email, phone, address, city, postcode } = parsed.data;

    // ── Server-side pricing (never trust client totals) ────────────────────
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const rawDelivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;

    // ── Promo re-validation on the server ─────────────────────────────────
    const promoCodeRaw = (body.promoCode as string | undefined)?.trim().toUpperCase();
    let discount       = 0;
    let validatedCode: string | undefined;
    let promoDocId:    string | undefined;
    let effectiveDelivery = rawDelivery;

    if (promoCodeRaw) {
      const promoItems = items.map((i) => ({
        productId: i.productId,
        category:  i.category ?? "",
        price:     i.price,
        quantity:  i.quantity,
      }));

      const promoResult = await applyPromo({
        code:      promoCodeRaw,
        userId:    body.userId as string | undefined,
        items:     promoItems,
        subtotal,
        postcode:  body.postcode as string | undefined,
      });

      if (promoResult.valid) {
        validatedCode = promoResult.code;
        discount      = promoResult.discountAmount;

        if (promoResult.discountType === "freeDelivery") {
          effectiveDelivery = 0;
          discount          = rawDelivery; // saving = the delivery fee waived
        }

        // Fetch the offer _id for usage recording
        await connectDB();
        const offerDoc = await Offer.findOne({ code: validatedCode }).select("_id").lean() as { _id: { toString(): string } } | null;
        if (offerDoc) promoDocId = offerDoc._id.toString();
      }
      // If re-validation fails, silently drop the promo — do not error the order
    }

    const total = Math.max(0, subtotal + effectiveDelivery - discount);

    // ── Create the order ───────────────────────────────────────────────────
    const result = await createOrder({
      userId:     body.userId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      items:      items.map(({ category: _cat, ...rest }) => rest),
      delivery:   { fullName, email, phone, address, city, postcode },
      subtotal,
      deliveryFee: effectiveDelivery,
      discount,
      promoCode:  validatedCode,
      total,
    });

    // ── Record promo usage (fire-and-forget — order already created) ───────
    if (validatedCode && promoDocId && body.userId) {
      void recordPromoUsage(
        promoDocId,
        validatedCode,
        body.userId as string,
        result.orderId,
        discount,
      );
    }

    return Response.json({ success: true, data: { ...result, total } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place order.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
