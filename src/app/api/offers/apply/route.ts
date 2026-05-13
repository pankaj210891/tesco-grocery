import { NextRequest, NextResponse } from "next/server";
import { applyPromo, type CartItemInput } from "@/services/promo.service";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from "@/lib/constants/promos";

/**
 * POST /api/offers/apply
 *
 * Full server-side promo application.
 * Returns backend-calculated totals — the client MUST use these values,
 * never recalculate discounts on the frontend.
 *
 * Body: { code, userId?, items: CartItemInput[], subtotal, postcode? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      code:      string;
      userId?:   string;
      items:     CartItemInput[];
      subtotal:  number;
      postcode?: string;
    };

    const { code, userId, subtotal, postcode } = body;
    const items: CartItemInput[] = body.items ?? [];

    if (!code?.trim()) {
      return NextResponse.json({ success: false, error: "Promo code is required" }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "Your cart is empty" }, { status: 400 });
    }
    if (typeof subtotal !== "number" || subtotal <= 0) {
      return NextResponse.json({ success: false, error: "Invalid cart subtotal" }, { status: 400 });
    }

    const result = await applyPromo({ code, userId, items, subtotal, postcode });

    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Compute full pricing breakdown server-side
    const rawDelivery     = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
    const effectiveDelivery =
      result.discountType === "freeDelivery" ? 0 : rawDelivery;
    const cartDiscount    =
      result.discountType === "freeDelivery" ? rawDelivery : result.discountAmount;
    const total           = Math.max(0, subtotal + effectiveDelivery - (result.discountType === "freeDelivery" ? 0 : result.discountAmount));

    return NextResponse.json({
      success: true,
      data: {
        code:           result.code,
        label:          result.label,
        discountType:   result.discountType,
        discountValue:  result.discountValue,
        discountAmount: result.discountAmount,
        minOrderValue:  result.minOrderValue,
        // ── Server-calculated cart totals ──────────────────────────────────────
        subtotal,
        deliveryFee:    effectiveDelivery,
        cartDiscount,
        total,
      },
    });
  } catch (err) {
    console.error("[POST /api/offers/apply]", err);
    return NextResponse.json({ success: false, error: "Failed to apply promo code" }, { status: 500 });
  }
}
