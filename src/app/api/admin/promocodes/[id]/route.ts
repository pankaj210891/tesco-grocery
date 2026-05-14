import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Offer from "@/lib/db/models/offer.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/admin/promocodes/[id] — update promo code
export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await connectDB();

  const body = await req.json() as Record<string, unknown>;

  const allowed = [
    "title", "subtitle", "description", "code", "discountType", "discountValue", "maxCap",
    "minOrderValue", "expiresAt", "isActive", "usageLimit", "perUserLimit", "firstOrderOnly",
    "eligibleCategories", "eligibleProductIds", "eligiblePincodes", "badge", "emoji", "color", "order",
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    if (key === "code") {
      update[key] = body[key] ? String(body[key]).toUpperCase().trim() : null;
    } else if (["discountValue", "maxCap", "minOrderValue", "usageLimit", "perUserLimit", "order"].includes(key)) {
      update[key] = body[key] != null ? Number(body[key]) : null;
    } else if (key === "expiresAt" && body[key]) {
      update[key] = new Date(String(body[key]));
    } else {
      update[key] = body[key];
    }
  }

  try {
    const doc = await Offer.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!doc) return NextResponse.json({ success: false, error: "Promo code not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err: unknown) {
    const msg = (err as { code?: number })?.code === 11000
      ? "A promo code with that code already exists"
      : "Failed to update promo code";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

// DELETE /api/admin/promocodes/[id] — delete promo code
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await connectDB();

  const doc = await Offer.findByIdAndDelete(id);
  if (!doc) return NextResponse.json({ success: false, error: "Promo code not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
