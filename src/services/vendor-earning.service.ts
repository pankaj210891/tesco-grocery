import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import VendorEarningModel from "@/lib/db/models/vendor-earning.model";
import OrderModel from "@/lib/db/models/order.model";
import type { VendorEarning, VendorEarningsSummary, EarningStatus } from "@/types";

interface RawItem {
  productId?:        string | null;
  vendorId?:         { toString(): string } | null;
  name:              string;
  quantity:          number;
  price:             number;
  commissionRate?:   number;
  commissionAmount?: number;
  vendorEarning?:    number;
}

function toEarning(doc: Record<string, unknown>): VendorEarning {
  return {
    _id:             String(doc._id),
    vendorId:        String(doc.vendorId),
    orderId:         String(doc.orderId),
    orderNumber:     String(doc.orderNumber),
    orderDate:       doc.orderDate instanceof Date ? doc.orderDate.toISOString() : String(doc.orderDate),
    items:           ((doc.items ?? []) as Record<string, unknown>[]).map((i) => ({
      productId:        String(i.productId ?? ""),
      name:             String(i.name ?? ""),
      quantity:         Number(i.quantity ?? 0),
      price:            Number(i.price ?? 0),
      commissionRate:   Number(i.commissionRate ?? 0),
      commissionAmount: Number(i.commissionAmount ?? 0),
      netEarning:       Number(i.netEarning ?? 0),
    })),
    grossAmount:     Number(doc.grossAmount ?? 0),
    commissionTotal: Number(doc.commissionTotal ?? 0),
    netAmount:       Number(doc.netAmount ?? 0),
    status:          String(doc.status ?? "pending") as EarningStatus,
    releasedAt:      doc.releasedAt instanceof Date ? doc.releasedAt.toISOString() : null,
    payoutRef:       String(doc.payoutRef ?? ""),
    createdAt:       doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

/**
 * Called fire-and-forget after order creation.
 * Groups order line items by vendorId and creates one earning ledger entry per vendor.
 */
export async function createEarningsForOrder(orderId: string): Promise<void> {
  await connectDB();

  const order = await OrderModel.findById(orderId)
    .select("orderNumber createdAt items")
    .lean<{ orderNumber: string; createdAt: Date; items: RawItem[] }>();

  if (!order) return;

  // Group items by vendorId — skip items without a vendor (platform-direct items)
  const vendorMap = new Map<string, RawItem[]>();
  for (const item of order.items) {
    const vid = item.vendorId?.toString();
    if (!vid) continue;
    if (!vendorMap.has(vid)) vendorMap.set(vid, []);
    vendorMap.get(vid)!.push(item);
  }

  if (vendorMap.size === 0) return;

  const docs = Array.from(vendorMap.entries()).map(([vendorId, items]) => {
    const gross      = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const commission = items.reduce((s, i) => s + (i.commissionAmount ?? 0), 0);
    const net        = items.reduce((s, i) => s + (i.vendorEarning ?? i.price * i.quantity - (i.commissionAmount ?? 0)), 0);

    return {
      vendorId:        new mongoose.Types.ObjectId(vendorId),
      orderId:         new mongoose.Types.ObjectId(orderId),
      orderNumber:     order.orderNumber,
      orderDate:       order.createdAt,
      items:           items.map((i) => ({
        productId:        i.productId ?? "",
        name:             i.name,
        quantity:         i.quantity,
        price:            i.price,
        commissionRate:   i.commissionRate   ?? 0,
        commissionAmount: i.commissionAmount ?? 0,
        netEarning:       i.vendorEarning    ?? (i.price * i.quantity - (i.commissionAmount ?? 0)),
      })),
      grossAmount:     Math.round(gross * 100) / 100,
      commissionTotal: Math.round(commission * 100) / 100,
      netAmount:       Math.round(net * 100) / 100,
      status:          "pending",
    };
  });

  // insertMany is idempotent-safe — if it fails silently the cron/retry can recreate it
  await VendorEarningModel.insertMany(docs, { ordered: false });
}

/** Auto-confirm earnings when an order is delivered. */
export async function confirmEarningsForOrder(orderId: string): Promise<void> {
  await connectDB();
  await VendorEarningModel.updateMany(
    { orderId: new mongoose.Types.ObjectId(orderId), status: "pending" },
    { status: "confirmed" }
  );
}

/** Admin: release a single earning entry (mark as paid out). */
export async function releaseEarning(earningId: string, payoutRef?: string): Promise<VendorEarning | null> {
  await connectDB();

  if (!mongoose.isValidObjectId(earningId)) return null;

  const doc = await VendorEarningModel.findOneAndUpdate(
    { _id: earningId, status: "confirmed" },
    { status: "released", releasedAt: new Date(), payoutRef: payoutRef ?? "" },
    { new: true }
  ).lean();

  if (!doc) return null;
  const earning = toEarning(doc as unknown as Record<string, unknown>);

  // Fire-and-forget: notify vendor of payout
  void notifyVendorPayout(earning.vendorId, earning.netAmount, payoutRef ?? "", [earning.orderNumber]);

  return earning;
}

async function notifyVendorPayout(
  vendorId:     string,
  amount:       number,
  payoutRef:    string,
  orderNumbers: string[],
): Promise<void> {
  try {
    const VendorModel = (await import("@/lib/db/models/vendor.model")).default;
    const vendor = await VendorModel
      .findById(vendorId)
      .select("email name")
      .lean<{ email: string; name: string }>();

    if (!vendor?.email) return;

    const { sendVendorPayout } = await import("@/services/email.service");
    await sendVendorPayout(vendor.email, {
      vendorName:   vendor.name,
      amount,
      payoutRef,
      orderNumbers,
    });
  } catch (err) {
    console.error("[earning] Failed to send vendor payout notification:", err);
  }
}

export async function getVendorEarnings(
  vendorId: string,
  page = 1,
  limit = 20,
  status?: string
): Promise<{ earnings: VendorEarning[]; total: number; totalPages: number; page: number }> {
  await connectDB();

  const query: Record<string, unknown> = { vendorId: new mongoose.Types.ObjectId(vendorId) };
  if (status && ["pending", "confirmed", "released"].includes(status)) query.status = status;

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    VendorEarningModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    VendorEarningModel.countDocuments(query),
  ]);

  return {
    earnings:   (docs as unknown as Record<string, unknown>[]).map(toEarning),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}

export async function getVendorEarningsSummary(vendorId: string): Promise<VendorEarningsSummary> {
  await connectDB();

  const agg = await VendorEarningModel.aggregate<{ _id: string; total: number }>([
    { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
    { $group: { _id: "$status", total: { $sum: "$netAmount" } } },
  ]);

  const map = new Map(agg.map((r) => [r._id, r.total]));
  return {
    totalPending:   Math.round((map.get("pending")   ?? 0) * 100) / 100,
    totalConfirmed: Math.round((map.get("confirmed") ?? 0) * 100) / 100,
    totalReleased:  Math.round((map.get("released")  ?? 0) * 100) / 100,
    totalEarned:    Math.round(Array.from(map.values()).reduce((s, v) => s + v, 0) * 100) / 100,
  };
}

export interface AdminEarningsFilters {
  vendorId?: string;
  status?:   string;
  page?:     number;
  limit?:    number;
}

export async function getAllEarnings(filters: AdminEarningsFilters = {}): Promise<{
  earnings: VendorEarning[];
  total:    number;
  totalPages: number;
  page:     number;
}> {
  await connectDB();

  const { vendorId, status, page = 1, limit = 20 } = filters;
  const query: Record<string, unknown> = {};
  if (vendorId && mongoose.isValidObjectId(vendorId)) {
    query.vendorId = new mongoose.Types.ObjectId(vendorId);
  }
  if (status && ["pending", "confirmed", "released"].includes(status)) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    VendorEarningModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    VendorEarningModel.countDocuments(query),
  ]);

  return {
    earnings:   (docs as unknown as Record<string, unknown>[]).map(toEarning),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}
