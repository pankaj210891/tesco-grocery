import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Offer from "@/lib/db/models/offer.model";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const filter: Record<string, unknown> = {
      isActive:  true,
      expiresAt: { $gt: new Date() },
    };
    if (category && category !== "all") filter.category = category;

    const offers = await Offer.find(filter).sort({ order: 1 }).lean();
    return NextResponse.json({ success: true, data: offers });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch offers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body  = await req.json();
    const offer = await Offer.create(body);
    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create offer";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
