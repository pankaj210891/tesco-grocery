import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Offer from "@/lib/db/models/offer.model";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json() as { code?: string; subtotal?: number };
    const code = body.code?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ success: false, error: "Promo code is required" }, { status: 400 });
    }

    const offer = await Offer.findOne({
      code,
      isActive:  true,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!offer) {
      return NextResponse.json({ success: false, error: "Invalid or expired promo code" }, { status: 404 });
    }

    const subtotal = typeof body.subtotal === "number" ? body.subtotal : 0;
    if (subtotal > 0 && subtotal < offer.minOrderValue) {
      return NextResponse.json({
        success: false,
        error: `Minimum order of £${offer.minOrderValue.toFixed(2)} required for this code`,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        code:          offer.code,
        label:         offer.title,
        discountType:  offer.discountType,
        discountValue: offer.discountValue,
        minOrderValue: offer.minOrderValue,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to validate promo code" }, { status: 500 });
  }
}
