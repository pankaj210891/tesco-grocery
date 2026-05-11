import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";
import ProductModel from "@/lib/db/models/product.model";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const vendor = await VendorModel.findById(id).lean();
    if (!vendor) return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });

    const productCount = await ProductModel.countDocuments({ vendorId: id });
    return NextResponse.json({ success: true, data: { ...vendor, productCount } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch vendor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json() as Record<string, unknown>;

    const vendor = await VendorModel.findByIdAndUpdate(
      id, { $set: body }, { new: true, runValidators: true }
    );
    if (!vendor) return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: vendor });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const vendor = await VendorModel.findByIdAndDelete(id);
    if (!vendor) return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Vendor deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete vendor" }, { status: 500 });
  }
}
