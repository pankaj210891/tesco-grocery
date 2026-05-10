import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Faq from "@/lib/db/models/faq.model";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const faq  = await Faq.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!faq) return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: faq });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update FAQ";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const faq = await Faq.findByIdAndDelete(id);
    if (!faq) return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "FAQ deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete FAQ" }, { status: 500 });
  }
}
