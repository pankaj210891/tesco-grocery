import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import VendorModel from "@/lib/db/models/vendor.model";
import { AdminProductUpdateSchema } from "@/lib/validations/admin-filters";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid product ID" }, { status: 400 });
    }

    const raw = await req.json() as unknown;

    const parsed = AdminProductUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 422 },
      );
    }

    // Resolve vendor if vendorId is being changed
    let update: Record<string, unknown> = { ...parsed.data };

    if ("vendorId" in parsed.data) {
      const incomingVendorId = parsed.data.vendorId;

      if (incomingVendorId) {
        if (!mongoose.isValidObjectId(incomingVendorId)) {
          return NextResponse.json({ success: false, error: "Invalid vendorId" }, { status: 400 });
        }
        const vendor = await VendorModel.findById(incomingVendorId).select("name status").lean();
        if (!vendor) {
          return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
        }
        if (vendor.status !== "active") {
          return NextResponse.json({ success: false, error: "Vendor is not active" }, { status: 422 });
        }
        // Always use the authoritative name from the DB
        update = { ...update, vendorId: vendor._id, vendorName: vendor.name };
      } else {
        // Explicit null/empty clears the vendor mapping
        update = { ...update, vendorId: null, vendorName: null };
      }
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: product });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

// Admin-only: approve or reject a vendor product
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid product ID" }, { status: 400 });
    }

    const { status } = await req.json() as { status: string };

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status value" }, { status: 422 });
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    );
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: product });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update product status" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid product ID" }, { status: 400 });
    }

    const product = await ProductModel.findByIdAndDelete(id);
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}
