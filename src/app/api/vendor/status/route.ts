import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import UserModel from "@/lib/db/models/user.model";
import VendorModel from "@/lib/db/models/vendor.model";

export interface VendorStatusData {
  status: "active" | "pending" | "suspended" | "not_found";
  vendorId?: string;
  name?: string;
  isAdmin?: boolean;
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await UserModel.findById(auth.userId).lean<{ role: string; status: string }>();
  if (!user || (user.role !== "vendor" && user.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Vendor access required" }, { status: 403 });
  }
  if (user.status === "suspended") {
    return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });
  }

  if (user.role === "admin") {
    return NextResponse.json({ success: true, data: { status: "active", isAdmin: true } satisfies VendorStatusData });
  }

  type VendorLean = { _id: { toString(): string }; status: string; name: string };

  let vendor = await VendorModel.findOne({ ownerId: auth.userId }).lean<VendorLean>();

  // Fallback: if ownerId is mismatched (e.g. seeded vendor), match by email and repair ownerId.
  if (!vendor) {
    vendor = await VendorModel.findOneAndUpdate(
      { email: auth.email },
      { $set: { ownerId: auth.userId } },
      { new: true }
    ).lean<VendorLean>();
  }

  if (!vendor) {
    return NextResponse.json({ success: true, data: { status: "not_found" } satisfies VendorStatusData });
  }

  return NextResponse.json({
    success: true,
    data: {
      status:   vendor.status as VendorStatusData["status"],
      vendorId: vendor._id.toString(),
      name:     vendor.name,
    } satisfies VendorStatusData,
  });
}
