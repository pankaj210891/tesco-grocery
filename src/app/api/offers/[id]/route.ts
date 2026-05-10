import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Offer from "@/lib/db/models/offer.model";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const offer = await Offer.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!offer) return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: offer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update offer";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Offer deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete offer" }, { status: 500 });
  }
}
