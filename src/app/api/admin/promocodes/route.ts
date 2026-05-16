import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Offer, { type DiscountType } from "@/lib/db/models/offer.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

// GET /api/admin/promocodes — list all promo codes
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const sp     = req.nextUrl.searchParams;
  const search = sp.get("q")?.trim() ?? "";
  const status = sp.get("status");  // "active" | "expired" | "inactive"

  const query: Record<string, unknown> = {};
  if (search) query.code = { $regex: search, $options: "i" };

  const now = new Date();
  if (status === "active")   { query.isActive = true;  query.expiresAt = { $gte: now }; }
  if (status === "expired")  { query.expiresAt = { $lt: now }; }
  if (status === "inactive") { query.isActive = false; }

  const docs = await Offer.find(query).sort({ order: 1, createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: docs });
}

// POST /api/admin/promocodes — create promo code
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const body = await req.json() as Record<string, unknown>;

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
  }
  if (!body.discountType || !["percentage", "fixed", "freeDelivery"].includes(body.discountType as string)) {
    return NextResponse.json({ success: false, error: "Valid discount type is required" }, { status: 400 });
  }
  if (!body.expiresAt) {
    return NextResponse.json({ success: false, error: "Expiry date is required" }, { status: 400 });
  }

  try {
    const doc = await Offer.create({
      title:              body.title as string,
      subtitle:           (body.subtitle as string | undefined) ?? "",
      description:        (body.description as string | undefined) ?? "",
      code:               body.code ? String(body.code).toUpperCase().trim() : undefined,
      discountType:       body.discountType as DiscountType,
      discountValue:      Number(body.discountValue ?? 0),
      maxCap:             body.maxCap != null ? Number(body.maxCap) : null,
      minOrderValue:      Number(body.minOrderValue ?? 0),
      expiresAt:          new Date(String(body.expiresAt)),
      isActive:           (body.isActive as boolean | undefined) ?? true,
      usageLimit:         body.usageLimit != null ? Number(body.usageLimit) : null,
      perUserLimit:       body.perUserLimit != null ? Number(body.perUserLimit) : null,
      firstOrderOnly:     (body.firstOrderOnly as boolean | undefined) ?? false,
      eligibleCategories: Array.isArray(body.eligibleCategories) ? (body.eligibleCategories as string[]) : [],
      eligibleProductIds: Array.isArray(body.eligibleProductIds) ? (body.eligibleProductIds as string[]) : [],
      eligiblePincodes:   Array.isArray(body.eligiblePincodes)   ? (body.eligiblePincodes   as string[]) : [],
      badge:              (body.badge as string | undefined) ?? "",
      emoji:              (body.emoji as string | undefined) ?? "",
      color:              (body.color as string | undefined) ?? "",
      order:              Number(body.order ?? 0),
    });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err: unknown) {
    const msg = (err as { code?: number })?.code === 11000
      ? "A promo code with that code already exists"
      : "Failed to create promo code";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
