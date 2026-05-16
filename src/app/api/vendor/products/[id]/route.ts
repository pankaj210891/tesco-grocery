import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    const existing = await ProductModel.findById(id).lean<{ vendorId: { toString(): string } | null }>();
    if (!existing) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    if (existing.vendorId?.toString() !== auth.vendorId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as Record<string, unknown>;
    const allowed = ["name", "description", "price", "originalPrice", "images", "category", "brand", "unit", "inStock", "tags", "badge"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    // Merge dynamic attributes safely
    if (body.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes)) {
      const safeAttrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(body.attributes as Record<string, unknown>)) {
        const key = k.replace(/[^a-z0-9_]/gi, "");
        if (key && typeof v === "string" && v.trim()) {
          safeAttrs[key] = v.trim();
        }
      }
      update.attributes = safeAttrs;
    }

    const product = await ProductModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    return NextResponse.json({ success: true, data: product });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    const existing = await ProductModel.findById(id).lean<{ vendorId: { toString(): string } | null }>();
    if (!existing) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    if (existing.vendorId?.toString() !== auth.vendorId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await ProductModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}
