import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import VendorModel from "@/lib/db/models/vendor.model";
import { verifyToken, type AuthPayload } from "@/services/auth.service";

export function getAuthUser(req: Request): AuthPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return verifyToken(header.slice(7));
  } catch {
    return null;
  }
}

export async function requireAdmin(req: Request): Promise<AuthPayload | NextResponse> {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const user = await UserModel.findById(auth.userId).lean<{ role: string; status: string }>();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }
  if (user.status === "suspended") {
    return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });
  }
  return auth;
}

export interface VendorAuth extends AuthPayload {
  vendorId: string;
}

export async function requireVendor(req: Request): Promise<VendorAuth | NextResponse> {
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
  type VendorLean = { _id: { toString(): string }; status: string };

  let vendor = await VendorModel.findOne({ ownerId: auth.userId }).lean<VendorLean>();

  // Fallback: seeded vendors have a different ownerId than the real login user.
  // If the vendor email matches the authenticated user's email, claim it and fix ownerId.
  if (!vendor && user.role !== "admin") {
    vendor = await VendorModel.findOneAndUpdate(
      { email: auth.email },
      { $set: { ownerId: auth.userId } },
      { new: true }
    ).lean<VendorLean>();
  }

  if (!vendor && user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No vendor profile found for this account. Please contact support." }, { status: 403 });
  }
  if (vendor && vendor.status === "pending" && user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Your vendor application is pending admin approval.", code: "VENDOR_PENDING" }, { status: 403 });
  }
  if (vendor && vendor.status === "suspended" && user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Your vendor account has been suspended. Please contact support.", code: "VENDOR_SUSPENDED" }, { status: 403 });
  }
  return { ...auth, vendorId: vendor?._id.toString() ?? "" };
}
