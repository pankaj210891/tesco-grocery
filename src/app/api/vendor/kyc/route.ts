import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";
import { submitKycSchema } from "@/lib/validations/vendor-kyc";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const vendor = await VendorModel.findOne({ ownerId: auth.userId })
    .select("kyc")
    .lean();

  if (!vendor) {
    return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: vendor.kyc ?? {} });
}

export async function POST(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submitKycSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 },
    );
  }

  const { panNumber, gstNumber, aadhaarNumber } = parsed.data;

  await connectDB();

  const vendor = await VendorModel.findOne({ ownerId: auth.userId });
  if (!vendor) {
    return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
  }

  if (vendor.kyc?.status === "verified") {
    return NextResponse.json(
      { success: false, error: "KYC is already verified and cannot be resubmitted" },
      { status: 409 },
    );
  }

  vendor.kyc = {
    panNumber,
    gstNumber,
    // Store only last 4 digits for display; never expose full Aadhaar
    aadhaarLast4:    aadhaarNumber.slice(-4),
    status:          "pending",
    rejectionReason: "",
    submittedAt:     new Date(),
    reviewedAt:      undefined,
  };

  await vendor.save();

  return NextResponse.json({ success: true, data: vendor.kyc });
}
