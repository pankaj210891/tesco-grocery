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
  const vendor = await VendorModel.findOne({ ownerId: auth.userId, status: "active" }).lean<{ _id: { toString(): string } }>();
  if (!vendor && user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No active vendor profile found" }, { status: 403 });
  }
  return { ...auth, vendorId: vendor?._id.toString() ?? "" };
}
