import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";

const updateProfileSchema = z.object({
  name:        z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  logo:        z.string().url("Logo must be a valid URL").optional(),
  phone:       z.string().regex(/^\+?[\d\s\-()]{7,20}$/, "Invalid phone number").optional(),
  address:     z.string().max(200).optional(),
  city:        z.string().max(100).optional(),
});

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
    const rawBody = await req.json().catch(() => ({}));
    const parsed = updateProfileSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 422 },
      );
    }
    const update: Record<string, unknown> = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    );

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
