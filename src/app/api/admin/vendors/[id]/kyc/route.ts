import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";
import { adminKycReviewSchema } from "@/lib/validations/vendor-kyc";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid vendor ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminKycReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 },
    );
  }

  const { action, rejectionReason } = parsed.data;

  await connectDB();

  const vendor = await VendorModel.findById(id);
  if (!vendor) {
    return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
  }

  if (!vendor.kyc || vendor.kyc.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "No pending KYC submission to review" },
      { status: 409 },
    );
  }

  vendor.kyc.status      = action;
  vendor.kyc.reviewedAt  = new Date();
  vendor.kyc.rejectionReason = action === "rejected" ? (rejectionReason ?? "") : "";

  await vendor.save();

  return NextResponse.json({ success: true, data: vendor.kyc });
}
