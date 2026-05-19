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
    const allowed = [
      "name", "description", "price", "originalPrice",
      "images", "category", "brand", "unit",
      "inStock", "stockQuantity", "lowStockThreshold",
      "tags", "badge",
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    // When stockQuantity is explicitly tracked, derive inStock automatically
    if (typeof body.stockQuantity === "number") {
      update.inStock = body.stockQuantity > 0;
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

    // Replace variants array when provided
    if (Array.isArray(body.variants)) {
      const safeVariants: Array<{ label: string; sku: string; price: number | null; originalPrice: number | null; stockQuantity: number | null; inStock: boolean }> = [];
      for (const v of body.variants as unknown[]) {
        if (typeof v !== "object" || v === null) continue;
        const vv = v as Record<string, unknown>;
        if (!vv.label || typeof vv.label !== "string" || !vv.label.trim()) continue;
        safeVariants.push({
          label:         vv.label.trim(),
          sku:           typeof vv.sku === "string" ? vv.sku.trim() : "",
          price:         typeof vv.price === "number" ? vv.price : null,
          originalPrice: typeof vv.originalPrice === "number" ? vv.originalPrice : null,
          stockQuantity: typeof vv.stockQuantity === "number" ? vv.stockQuantity : null,
          inStock:       typeof vv.inStock === "boolean" ? vv.inStock : true,
        });
      }
      update.variants = safeVariants;
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
