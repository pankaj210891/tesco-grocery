import { NextRequest, NextResponse } from "next/server";
import { getEligiblePromos, type CartItemInput } from "@/services/promo.service";

/**
 * POST /api/offers/eligible
 *
 * Returns all promo codes that genuinely apply to the current cart.
 * Includes server-calculated projected savings per promo.
 *
 * Body: { userId?, items: CartItemInput[], subtotal }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      userId?:  string;
      items:    CartItemInput[];
      subtotal: number;
    };

    const { userId, subtotal } = body;
    const items: CartItemInput[] = body.items ?? [];

    if (items.length === 0 || typeof subtotal !== "number" || subtotal <= 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const promos = await getEligiblePromos({ userId, items, subtotal });
    return NextResponse.json({ success: true, data: promos });
  } catch (err) {
    console.error("[POST /api/offers/eligible]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch eligible promos" }, { status: 500 });
  }
}
