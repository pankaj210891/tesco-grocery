/**
 * POST /api/admin/migrations/fix-vendor-remap
 *
 * General migration: scans EVERY vendor in the database and auto-detects
 * cases where products / orders reference a stale vendorId (e.g. from a seed
 * run) instead of the vendor's actual _id.
 *
 * ── Detection strategy ────────────────────────────────────────────────────────
 * Products embed both `vendorId` (ObjectId) and `vendorName` (plain string).
 * A mismatch exists when:
 *   • vendor V has 0 products with vendorId = V._id
 *   • AND products exist whose vendorName = V.name but vendorId ≠ V._id
 *
 * The stale vendorId(s) found on those products are the IDs to remap FROM.
 *
 * Optional `overrides` body field handles vendors whose DB name differs from
 * the embedded vendorName on products (e.g. vendor registered under a slightly
 * different business name):
 *   overrides: [{ staleId: "<old>", realId: "<new>" }]
 *
 * ── Collections updated per mismatch ─────────────────────────────────────────
 *   1. Product.vendorId
 *   2. VendorOrder.vendorId
 *   3. VendorEarning.vendorId
 *   4. Order.items[].vendorId  (array-filter bulk update)
 *   5. Vendor document for staleId is deleted
 *
 * Body:
 *   { dryRun?: boolean, overrides?: { staleId: string; realId: string }[] }
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { connectDB } from "@/lib/db/mongoose";
import ProductModel from "@/lib/db/models/product.model";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import VendorEarningModel from "@/lib/db/models/vendor-earning.model";
import VendorModel from "@/lib/db/models/vendor.model";
import OrderModel from "@/lib/db/models/order.model";

interface RemapPair {
  staleId: string;
  realId:  string;
}

interface VendorRemapResult {
  realVendorId:        string;
  realVendorName:      string;
  staleIds:            string[];
  source:              "auto" | "override";
  productsUpdated:     number;
  vendorOrdersUpdated: number;
  earningsUpdated:     number;
  ordersUpdated:       number;
  staleVendorsDeleted: number;
}

interface UnresolvableSeedVendor {
  vendorId:   string;
  vendorName: string;
  productCount: number;
  reason:     string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toOid(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

async function remapPair(
  staleOid: mongoose.Types.ObjectId,
  realOid:  mongoose.Types.ObjectId,
  dryRun:   boolean,
): Promise<{
  productsUpdated:     number;
  vendorOrdersUpdated: number;
  earningsUpdated:     number;
  ordersUpdated:       number;
  staleVendorDeleted:  number;
}> {
  if (dryRun) {
    const [products, vendorOrders, earnings, orders, staleExists] = await Promise.all([
      ProductModel.countDocuments({ vendorId: staleOid }),
      VendorOrderModel.countDocuments({ vendorId: staleOid }),
      VendorEarningModel.countDocuments({ vendorId: staleOid }),
      OrderModel.countDocuments({ "items.vendorId": staleOid }),
      VendorModel.exists({ _id: staleOid }),
    ]);
    return {
      productsUpdated:     products,
      vendorOrdersUpdated: vendorOrders,
      earningsUpdated:     earnings,
      ordersUpdated:       orders,
      staleVendorDeleted:  staleExists ? 1 : 0,
    };
  }

  const [pr, vor, er, or_, del] = await Promise.all([
    ProductModel.updateMany(
      { vendorId: staleOid },
      { $set: { vendorId: realOid } },
    ),
    VendorOrderModel.updateMany(
      { vendorId: staleOid },
      { $set: { vendorId: realOid } },
    ),
    VendorEarningModel.updateMany(
      { vendorId: staleOid },
      { $set: { vendorId: realOid } },
    ),
    OrderModel.updateMany(
      { "items.vendorId": staleOid },
      { $set: { "items.$[el].vendorId": realOid } },
      { arrayFilters: [{ "el.vendorId": staleOid }] },
    ),
    VendorModel.deleteOne({ _id: staleOid }),
  ]);

  return {
    productsUpdated:     pr.modifiedCount,
    vendorOrdersUpdated: vor.modifiedCount,
    earningsUpdated:     er.modifiedCount,
    ordersUpdated:       or_.modifiedCount,
    staleVendorDeleted:  del.deletedCount ?? 0,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  let dryRun  = false;
  let overrides: RemapPair[] = [];

  try {
    const body = await req.json();
    if (body?.dryRun === true) dryRun = true;
    if (Array.isArray(body?.overrides)) {
      overrides = (body.overrides as RemapPair[]).filter(
        (o) =>
          typeof o.staleId === "string" &&
          typeof o.realId  === "string" &&
          mongoose.Types.ObjectId.isValid(o.staleId) &&
          mongoose.Types.ObjectId.isValid(o.realId)  &&
          o.staleId !== o.realId,
      );
    }
  } catch {
    // no body — proceed with defaults
  }

  // ── Step 1: auto-detect mismatches for every vendor in DB ─────────────────
  type VendorLean = { _id: mongoose.Types.ObjectId; name: string };
  const allVendors = await VendorModel.find({}).select("_id name").lean<VendorLean[]>();

  const results: VendorRemapResult[]          = [];
  const unresolvable: UnresolvableSeedVendor[] = [];

  // Track stale IDs already handled (via auto or overrides) to avoid double-processing
  const handledStaleIds = new Set<string>();

  // ── Step 2: process explicit overrides first ────────────────────────────────
  for (const ov of overrides) {
    const realOid  = toOid(ov.realId);
    const staleOid = toOid(ov.staleId);

    const realVendor = await VendorModel.findById(realOid).select("name").lean<VendorLean>();
    if (!realVendor) continue;

    const counts = await remapPair(staleOid, realOid, dryRun);

    results.push({
      realVendorId:        ov.realId,
      realVendorName:      realVendor.name,
      staleIds:            [ov.staleId],
      source:              "override",
      productsUpdated:     counts.productsUpdated,
      vendorOrdersUpdated: counts.vendorOrdersUpdated,
      earningsUpdated:     counts.earningsUpdated,
      ordersUpdated:       counts.ordersUpdated,
      staleVendorsDeleted: counts.staleVendorDeleted,
    });

    handledStaleIds.add(ov.staleId);
  }

  // ── Step 3: auto-detect by vendorName matching ─────────────────────────────
  for (const vendor of allVendors) {
    const realId   = vendor._id;
    const realName = vendor.name;

    // Skip this vendor if its _id was already identified as a stale ID in a
    // previous iteration — it has been (or will be) remapped away and deleted.
    // Without this guard, two vendors sharing the same name would each treat
    // the other as "stale", causing a destructive ping-pong remap.
    if (handledStaleIds.has(realId.toString())) continue;

    // Find products whose embedded vendorName matches this vendor's name
    // but whose vendorId points to a DIFFERENT vendor (the stale/seed one)
    type ProductLean = { vendorId: mongoose.Types.ObjectId | null };
    const mislinkedProducts = await ProductModel.find(
      {
        vendorName: { $regex: `^${escapeRegex(realName)}$`, $options: "i" },
        vendorId:   { $nin: [realId, null] },
      },
      { vendorId: 1 },
    ).lean<(ProductLean & { _id: mongoose.Types.ObjectId })[]>();

    if (mislinkedProducts.length === 0) continue;

    // Collect distinct stale IDs that haven't been handled yet
    const freshStaleIds: mongoose.Types.ObjectId[] = [];
    for (const p of mislinkedProducts) {
      if (!p.vendorId) continue;
      const sid = p.vendorId.toString();
      if (!handledStaleIds.has(sid)) {
        freshStaleIds.push(p.vendorId);
        handledStaleIds.add(sid);
      }
    }

    if (freshStaleIds.length === 0) continue;

    // Deduplicate
    const uniqueStaleOids = Array.from(
      new Map(freshStaleIds.map((id) => [id.toString(), id])).values()
    );

    const result: VendorRemapResult = {
      realVendorId:        realId.toString(),
      realVendorName:      realName,
      staleIds:            uniqueStaleOids.map((id) => id.toString()),
      source:              "auto",
      productsUpdated:     0,
      vendorOrdersUpdated: 0,
      earningsUpdated:     0,
      ordersUpdated:       0,
      staleVendorsDeleted: 0,
    };

    for (const staleOid of uniqueStaleOids) {
      const counts = await remapPair(staleOid, realId, dryRun);
      result.productsUpdated     += counts.productsUpdated;
      result.vendorOrdersUpdated += counts.vendorOrdersUpdated;
      result.earningsUpdated     += counts.earningsUpdated;
      result.ordersUpdated       += counts.ordersUpdated;
      result.staleVendorsDeleted += counts.staleVendorDeleted;
    }

    results.push(result);
  }

  // ── Step 4: report seed vendors that still have products but no real match ──
  // These are stale vendors that couldn't be auto-resolved (different name from
  // any real vendor). Admin must supply them via `overrides`.
  type SeedProductCount = { _id: mongoose.Types.ObjectId; count: number };
  const productsByVendor = await ProductModel.aggregate<SeedProductCount>([
    { $match: { vendorId: { $ne: null } } },
    { $group: { _id: "$vendorId", count: { $sum: 1 } } },
  ]);

  const realVendorIdStrings = new Set(allVendors.map((v) => v._id.toString()));

  for (const row of productsByVendor) {
    const vid = row._id.toString();
    if (realVendorIdStrings.has(vid)) continue;      // valid — points to an existing vendor
    if (handledStaleIds.has(vid)) continue;          // already remapped above

    // This vendorId doesn't match any current vendor and wasn't auto-resolved
    const orphan = await VendorModel.findById(row._id).select("name").lean<VendorLean | null>();
    unresolvable.push({
      vendorId:     vid,
      vendorName:   orphan?.name ?? "(vendor doc not found)",
      productCount: row.count,
      reason:       orphan
        ? "Stale vendor doc exists but no real vendor shares this name — add to overrides[]"
        : "Vendor document deleted — products are orphaned — add to overrides[]",
    });
  }

  return NextResponse.json({
    success:         true,
    dryRun,
    totalVendors:    allVendors.length,
    remapped:        results.length,
    results,
    unresolvable,
    ...(unresolvable.length > 0 && {
      hint: "Supply unresolvable pairs via: POST body { overrides: [{ staleId, realId }] }",
    }),
  });
}
