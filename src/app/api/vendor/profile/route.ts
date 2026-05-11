import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const vendor = await VendorModel.findOne({ ownerId: auth.userId }).lean();
    if (!vendor) return NextResponse.json({ success: false, error: "Vendor profile not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: vendor });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json() as Record<string, unknown>;
    const allowed = ["name", "description", "logo", "phone", "address", "city"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const vendor = await VendorModel.findOneAndUpdate(
      { ownerId: auth.userId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!vendor) return NextResponse.json({ success: false, error: "Vendor profile not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: vendor });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}
