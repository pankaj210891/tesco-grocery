import { NextRequest, NextResponse } from "next/server";
import { applyPromo, type CartItemInput } from "@/services/promo.service";

/**
 * POST /api/offers/validate
 *
 * Lightweight validation check — returns validity and a human-readable error.
 * For the full apply flow (with server-calculated totals) use POST /api/offers/apply.
 *
 * Body: { code, userId?, items?: CartItemInput[], subtotal?, postcode? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      code:      string;
      userId?:   string;
      items?:    CartItemInput[];
      subtotal?: number;
      postcode?: string;
    };

    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ success: false, error: "Promo code is required" }, { status: 400 });
    }

    const items    = body.items    ?? [];
    const subtotal = body.subtotal ?? 0;

    const result = await applyPromo({ code, userId: body.userId, items, subtotal, postcode: body.postcode });

    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        code:          result.code,
        label:         result.label,
        discountType:  result.discountType,
        discountValue: result.discountValue,
        discountAmount: result.discountAmount,
        minOrderValue: result.minOrderValue,
      },
    });
  } catch (err) {
    console.error("[POST /api/offers/validate]", err);
    return NextResponse.json({ success: false, error: "Failed to validate promo code" }, { status: 500 });
  }
}
