import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json() as Record<string, unknown>;

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: product });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const product = await ProductModel.findByIdAndDelete(id);
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}
