import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import VendorModel from "@/lib/db/models/vendor.model";
import { verifyToken, type AuthPayload } from "@/services/auth.service";
import { isTokenRevoked } from "@/lib/blocklist";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAuthUser(req: Request): AuthPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return verifyToken(header.slice(7));
  } catch {
    return null;
  }
}

// ─── Role guards ──────────────────────────────────────────────────────────────

export async function requireAdmin(req: Request): Promise<AuthPayload | NextResponse> {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  // Reject revoked tokens (e.g. after logout) before hitting the database
  if (auth.jti && (await isTokenRevoked(auth.jti))) {
    return NextResponse.json({ success: false, error: "Token has been revoked" }, { status: 401 });
  }

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

  // Reject revoked tokens before hitting the database
  if (auth.jti && (await isTokenRevoked(auth.jti))) {
    return NextResponse.json({ success: false, error: "Token has been revoked" }, { status: 401 });
  }

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

  // ── Vendor email fallback ──────────────────────────────────────────────────
  // PRODUCTION: no fallback — ownerId must be correctly set at onboarding time.
  //             Any email-based claim is a privilege-escalation risk.
  // DEVELOPMENT: allow the fallback so seeded vendor accounts (which may have
  //              a mismatched ownerId) keep working without a migration step.
  if (!vendor && user.role !== "admin") {
    if (process.env.NODE_ENV === "development") {
      vendor = await VendorModel.findOneAndUpdate(
        { email: auth.email },
        { $set: { ownerId: auth.userId } },
        { new: true }
      ).lean<VendorLean>();
    }
  }

  if (!vendor && user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "No vendor profile found for this account. Please contact support." },
      { status: 403 }
    );
  }
  if (vendor && vendor.status === "pending" && user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Your vendor application is pending admin approval.", code: "VENDOR_PENDING" },
      { status: 403 }
    );
  }
  if (vendor && vendor.status === "suspended" && user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Your vendor account has been suspended. Please contact support.", code: "VENDOR_SUSPENDED" },
      { status: 403 }
    );
  }

  return { ...auth, vendorId: vendor?._id.toString() ?? "" };
}
