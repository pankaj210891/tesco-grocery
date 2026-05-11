import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Store from "@/lib/db/models/store.model";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const store = await Store.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!store) return NextResponse.json({ success: false, error: "Store not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: store });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update store";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const store = await Store.findByIdAndDelete(id);
    if (!store) return NextResponse.json({ success: false, error: "Store not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Store deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete store" }, { status: 500 });
  }
}
