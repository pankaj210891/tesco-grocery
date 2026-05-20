import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import VendorOrderModel, {
  VENDOR_ORDER_STATUSES,
  type VendorOrderStatus,
} from "@/lib/db/models/vendor-order.model";
import type { VendorOrder, VendorOrderItem } from "@/types";

// ─── Serialization ────────────────────────────────────────────────────────────

function toVendorOrder(doc: Record<string, unknown>): VendorOrder {
  return {
    _id:               String(doc._id),
    parentOrderId:     String(doc.parentOrderId),
    parentOrderNumber: String(doc.parentOrderNumber),
    vendorId:          String(doc.vendorId),
    vendorName:        String(doc.vendorName),
    customerId:        doc.customerId ? String(doc.customerId) : null,
    items: ((doc.items ?? []) as Record<string, unknown>[]).map((i) => ({
      productId:        String(i.productId ?? ""),
      variantId:        i.variantId ? String(i.variantId) : null,
      variantLabel:     i.variantLabel ? String(i.variantLabel) : null,
      name:             String(i.name ?? ""),
      slug:             String(i.slug ?? ""),
      price:            Number(i.price ?? 0),
      quantity:         Number(i.quantity ?? 0),
      image:            String(i.image ?? ""),
      commissionRate:   Number(i.commissionRate ?? 0),
      commissionAmount: Number(i.commissionAmount ?? 0),
      vendorEarning:    Number(i.vendorEarning ?? 0),
    })) as VendorOrderItem[],
    subtotal:          Number(doc.subtotal ?? 0),
    commissionTotal:   Number(doc.commissionTotal ?? 0),
    vendorEarning:     Number(doc.vendorEarning ?? 0),
    status:            String(doc.status ?? "PENDING") as VendorOrderStatus,
    statusHistory: ((doc.statusHistory ?? []) as Record<string, unknown>[]).map((h) => ({
      status:    String(h.status ?? ""),
      note:      String(h.note ?? ""),
      changedAt: h.changedAt instanceof Date
        ? h.changedAt.toISOString()
        : String(h.changedAt ?? ""),
    })),
    trackingNumber:     doc.trackingNumber ? String(doc.trackingNumber) : null,
    estimatedDelivery:  doc.estimatedDelivery instanceof Date
      ? doc.estimatedDelivery.toISOString()
      : (doc.estimatedDelivery ? String(doc.estimatedDelivery) : null),
    rejectionReason:    doc.rejectionReason ? String(doc.rejectionReason) : null,
    cancellationReason: doc.cancellationReason ? String(doc.cancellationReason) : null,
    refundStatus:       String(doc.refundStatus ?? "none") as VendorOrder["refundStatus"],
    refundedAmount:     Number(doc.refundedAmount ?? 0),
    earningId:          doc.earningId ? String(doc.earningId) : null,
    createdAt: doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : String(doc.createdAt ?? ""),
    updatedAt: doc.updatedAt instanceof Date
      ? doc.updatedAt.toISOString()
      : String(doc.updatedAt ?? ""),
  };
}

// ─── Bulk create (called inside parent order transaction) ─────────────────────

export interface CreateVendorOrderInput {
  parentOrderId:     mongoose.Types.ObjectId;
  parentOrderNumber: string;
  vendorId:          string;
  vendorName:        string;
  customerId?:       string | null;
  items:             VendorOrderItem[];
  subtotal:          number;
  commissionTotal:   number;
  vendorEarning:     number;
}

export function buildVendorOrderDocs(inputs: CreateVendorOrderInput[]) {
  return inputs.map((input) => ({
    parentOrderId:     input.parentOrderId,
    parentOrderNumber: input.parentOrderNumber,
    vendorId:          new mongoose.Types.ObjectId(input.vendorId),
    vendorName:        input.vendorName,
    customerId:        input.customerId ? new mongoose.Types.ObjectId(input.customerId) : null,
    items:             input.items,
    subtotal:          input.subtotal,
    commissionTotal:   input.commissionTotal,
    vendorEarning:     input.vendorEarning,
    status:            "PENDING" as const,
    statusHistory:     [{ status: "PENDING", note: "Order created", changedAt: new Date() }],
  }));
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface VendorOrderFilters {
  vendorId:  string;
  status?:   VendorOrderStatus;
  page?:     number;
  limit?:    number;
}

export async function getVendorOrders(filters: VendorOrderFilters): Promise<{
  data:       VendorOrder[];
  total:      number;
  page:       number;
  totalPages: number;
}> {
  await connectDB();
  const { vendorId, status, page = 1, limit = 20 } = filters;

  const query: Record<string, unknown> = {
    vendorId: new mongoose.Types.ObjectId(vendorId),
  };
  if (status && VENDOR_ORDER_STATUSES.includes(status)) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    VendorOrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    VendorOrderModel.countDocuments(query),
  ]);

  return {
    data:       (docs as unknown as Record<string, unknown>[]).map(toVendorOrder),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getVendorOrderById(
  vendorOrderId: string,
  vendorId:      string,
): Promise<VendorOrder | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(vendorOrderId)) return null;

  const doc = await VendorOrderModel.findOne({
    _id:      new mongoose.Types.ObjectId(vendorOrderId),
    vendorId: new mongoose.Types.ObjectId(vendorId),
  }).lean();

  if (!doc) return null;
  return toVendorOrder(doc as unknown as Record<string, unknown>);
}

export async function getVendorOrdersByParentOrder(
  parentOrderId: string,
): Promise<VendorOrder[]> {
  await connectDB();
  if (!mongoose.isValidObjectId(parentOrderId)) return [];

  const docs = await VendorOrderModel
    .find({ parentOrderId: new mongoose.Types.ObjectId(parentOrderId) })
    .lean();

  return (docs as unknown as Record<string, unknown>[]).map(toVendorOrder);
}

// ─── Status update ────────────────────────────────────────────────────────────

// Allowed transitions for vendors
export const VENDOR_TRANSITIONS: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  PENDING:          ["ACCEPTED", "CANCELLED"],
  ACCEPTED:         ["PREPARING", "CANCELLED"],
  PREPARING:        ["PACKED"],
  PACKED:           ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED:        ["RETURNED"],
  CANCELLED:        [],
  RETURNED:         ["REFUNDED"],
  REFUNDED:         [],
};

export async function updateVendorOrderStatus(
  vendorOrderId: string,
  vendorId:      string,
  newStatus:     VendorOrderStatus,
  note?:         string,
): Promise<VendorOrder | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(vendorOrderId)) return null;

  const current = await VendorOrderModel.findOne({
    _id:      new mongoose.Types.ObjectId(vendorOrderId),
    vendorId: new mongoose.Types.ObjectId(vendorId),
  }).lean<{ status: VendorOrderStatus }>();

  if (!current) return null;

  const allowed = VENDOR_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from ${current.status} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
    );
  }

  const doc = await VendorOrderModel.findByIdAndUpdate(
    vendorOrderId,
    {
      status: newStatus,
      $push:  {
        statusHistory: {
          status:    newStatus,
          note:      note ?? "",
          changedAt: new Date(),
        },
      },
    },
    { new: true },
  ).lean();

  if (!doc) return null;
  return toVendorOrder(doc as unknown as Record<string, unknown>);
}

// ─── Accept / Reject helpers ──────────────────────────────────────────────────

export async function acceptVendorOrder(
  vendorOrderId: string,
  vendorId:      string,
): Promise<VendorOrder | null> {
  return updateVendorOrderStatus(vendorOrderId, vendorId, "ACCEPTED", "Order accepted by vendor");
}

export async function rejectVendorOrder(
  vendorOrderId: string,
  vendorId:      string,
  reason:        string,
): Promise<VendorOrder | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(vendorOrderId)) return null;

  const current = await VendorOrderModel.findOne({
    _id:      new mongoose.Types.ObjectId(vendorOrderId),
    vendorId: new mongoose.Types.ObjectId(vendorId),
    status:   "PENDING",
  }).lean();

  if (!current) return null;

  const doc = await VendorOrderModel.findByIdAndUpdate(
    vendorOrderId,
    {
      status:           "CANCELLED",
      rejectionReason:  reason,
      $push: {
        statusHistory: {
          status:    "CANCELLED",
          note:      `Rejected: ${reason}`,
          changedAt: new Date(),
        },
      },
    },
    { new: true },
  ).lean();

  if (!doc) return null;
  return toVendorOrder(doc as unknown as Record<string, unknown>);
}

// ─── Vendor cancellation (vendor cancels their own sub-order) ─────────────────

export async function cancelVendorOrder(
  vendorOrderId: string,
  vendorId:      string,
  reason:        string,
): Promise<VendorOrder | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(vendorOrderId)) return null;

  // Only PENDING or ACCEPTED sub-orders can be cancelled by vendor
  const doc = await VendorOrderModel.findOneAndUpdate(
    {
      _id:      new mongoose.Types.ObjectId(vendorOrderId),
      vendorId: new mongoose.Types.ObjectId(vendorId),
      status:   { $in: ["PENDING", "ACCEPTED"] },
    },
    {
      status:             "CANCELLED",
      cancellationReason: reason,
      $push: {
        statusHistory: {
          status:    "CANCELLED",
          note:      reason,
          changedAt: new Date(),
        },
      },
    },
    { new: true },
  ).lean();

  if (!doc) return null;
  return toVendorOrder(doc as unknown as Record<string, unknown>);
}

// ─── Admin: get all vendor orders for a parent order ─────────────────────────

export async function getAdminVendorOrdersByParent(
  parentOrderId: string,
): Promise<VendorOrder[]> {
  return getVendorOrdersByParentOrder(parentOrderId);
}

// ─── Link earning to vendor order (called after earning creation) ─────────────

export async function linkEarningToVendorOrder(
  vendorOrderId: string,
  earningId:     string,
): Promise<void> {
  await connectDB();
  await VendorOrderModel.findByIdAndUpdate(vendorOrderId, { earningId });
}

// ─── Mark vendor order as refunded ───────────────────────────────────────────

export async function markVendorOrderRefunded(
  vendorOrderId:  string,
  refundedAmount: number,
  full:           boolean,
): Promise<void> {
  await connectDB();
  await VendorOrderModel.findByIdAndUpdate(vendorOrderId, {
    refundStatus:   full ? "full" : "partial",
    refundedAmount,
    $push: {
      statusHistory: {
        status:    "REFUNDED",
        note:      `Refund processed: ₹${refundedAmount}`,
        changedAt: new Date(),
      },
    },
  });
}

// ─── Admin override ───────────────────────────────────────────────────────────

export async function adminUpdateVendorOrderStatus(
  vendorOrderId: string,
  newStatus:     VendorOrderStatus,
  note?:         string,
): Promise<VendorOrder | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(vendorOrderId)) return null;

  if (!VENDOR_ORDER_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid vendor order status: ${newStatus}`);
  }

  const doc = await VendorOrderModel.findByIdAndUpdate(
    vendorOrderId,
    {
      status: newStatus,
      $push: {
        statusHistory: {
          status:    newStatus,
          note:      note ?? "Status updated by admin",
          changedAt: new Date(),
        },
      },
    },
    { new: true },
  ).lean();

  if (!doc) return null;
  return toVendorOrder(doc as unknown as Record<string, unknown>);
}
