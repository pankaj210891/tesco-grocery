/**
 * POST /api/admin/migrations/recover-deleted-vendors
 *
 * One-time recovery: finds vendor-role users who have no corresponding
 * Vendor document and recreates their vendor records, then remaps any
 * products/orders/earnings that still reference stale seed vendorIds
 * to the newly restored vendor _id.
 *
 * The stale seed vendorId is identified by scanning products whose
 * vendorName matches the user's name but vendorId points to a missing vendor.
 *
 * Admin-only. Dev-only (returns 403 in production).
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import VendorModel from "@/lib/db/models/vendor.model";
import ProductModel from "@/lib/db/models/product.model";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import VendorEarningModel from "@/lib/db/models/vendor-earning.model";
import OrderModel from "@/lib/db/models/order.model";

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  // ── 1. Find all vendor-role users ─────────────────────────────────────────
  type UserLean = { _id: mongoose.Types.ObjectId; name: string; email: string };
  const vendorUsers = await UserModel.find({ role: "vendor" })
    .select("_id name email")
    .lean<UserLean[]>();

  // ── 2. Find which ones have no Vendor doc ─────────────────────────────────
  const orphanedUsers: UserLean[] = [];
  for (const user of vendorUsers) {
    const hasVendor = await VendorModel.exists({ ownerId: user._id });
    if (!hasVendor) orphanedUsers.push(user);
  }

  if (orphanedUsers.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No orphaned vendor users found — nothing to recover.",
      recovered: [],
    });
  }

  const recovered: {
    userId:              string;
    userName:            string;
    userEmail:           string;
    newVendorId:         string;
    staleVendorId:       string | null;
    productsRemapped:    number;
    vendorOrdersRemapped: number;
    earningsRemapped:    number;
    ordersRemapped:      number;
  }[] = [];

  for (const user of orphanedUsers) {
    const vendorName = user.name;
    const slug       = toSlug(vendorName);

    // ── 3. Create (or find existing) vendor doc for this user ─────────────
    // Use findOneAndUpdate with upsert so a partial recovery re-run is safe.
    let finalSlug = slug;
    const slugTaken = await VendorModel.findOne({ slug, ownerId: { $ne: user._id } }).lean();
    if (slugTaken) finalSlug = `${slug}-restored`;

    type VendorLean = { _id: mongoose.Types.ObjectId };
    const vendorDoc = await VendorModel.findOneAndUpdate(
      { email: user.email },
      {
        $setOnInsert: {
          name:      vendorName,
          slug:      finalSlug,
          email:     user.email,
          ownerId:   user._id,
          ownerName: user.name,
          status:    "active",
        },
      },
      { upsert: true, new: true },
    ).lean<VendorLean>();

    const newVendorId = vendorDoc!._id;

    // ── 4. Find stale vendorId: products that mention this vendor by name
    //       but point to a different (likely deleted) vendorId.
    //       If none exist, skip — don't create an empty vendor doc for users
    //       whose seed vendor was legitimately cleaned up with no real products.
    type ProdLean = { vendorId: mongoose.Types.ObjectId | null };
    const staleDocs = await ProductModel.find(
      {
        vendorName: { $regex: `^${escapeRegex(vendorName)}$`, $options: "i" },
        vendorId:   { $nin: [newVendorId, null] },
      },
      { vendorId: 1 },
    ).lean<(ProdLean & { _id: mongoose.Types.ObjectId })[]>();

    if (staleDocs.length === 0) {
      // No mislinked products — this user's vendor was correctly cleaned up.
      // Delete the just-created vendor doc and skip.
      await VendorModel.deleteOne({ _id: vendorDoc!._id });
      continue;
    }

    const staleIdSet = new Set(staleDocs.map((p) => p.vendorId?.toString()).filter(Boolean));
    const staleIds   = Array.from(staleIdSet).map((id) => new mongoose.Types.ObjectId(id!));

    let productsRemapped    = 0;
    let vendorOrdersRemapped = 0;
    let earningsRemapped    = 0;
    let ordersRemapped      = 0;

    for (const staleId of staleIds) {
      const [pr, vor, er, or_] = await Promise.all([
        ProductModel.updateMany(
          { vendorId: staleId },
          { $set: { vendorId: newVendorId } },
        ),
        VendorOrderModel.updateMany(
          { vendorId: staleId },
          { $set: { vendorId: newVendorId } },
        ),
        VendorEarningModel.updateMany(
          { vendorId: staleId },
          { $set: { vendorId: newVendorId } },
        ),
        OrderModel.updateMany(
          { "items.vendorId": staleId },
          { $set: { "items.$[el].vendorId": newVendorId } },
          { arrayFilters: [{ "el.vendorId": staleId }] },
        ),
      ]);
      productsRemapped     += pr.modifiedCount;
      vendorOrdersRemapped += vor.modifiedCount;
      earningsRemapped     += er.modifiedCount;
      ordersRemapped       += or_.modifiedCount;
    }

    recovered.push({
      userId:              user._id.toString(),
      userName:            user.name,
      userEmail:           user.email,
      newVendorId:         newVendorId.toString(),
      staleVendorId:       staleIds[0]?.toString() ?? null,
      productsRemapped,
      vendorOrdersRemapped,
      earningsRemapped,
      ordersRemapped,
    });
  }

  return NextResponse.json({ success: true, recovered });
}
