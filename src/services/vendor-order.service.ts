import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import VendorOrderModel, {
  VENDOR_ORDER_STATUSES,
  type VendorOrderStatus,
} from "@/lib/db/models/vendor-order.model";
import OrderModel from "@/lib/db/models/order.model";
import {
  VENDOR_TRANSITIONS as CENTRAL_VENDOR_TRANSITIONS,
  validateStatusTransition,
  type ActorRole,
} from "@/constants/order-status";
import type { VendorOrder, VendorOrderItem } from "@/types";
import { decodeCursor, findKeyset, COMMON_SORT_CONFIGS } from "@/lib/pagination/keyset";

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
      updatedBy: h.updatedBy ? String(h.updatedBy) : null,
      role:      (h.role as "admin" | "vendor" | "system") ?? "system",
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
    statusHistory:     [{
      status:    "PENDING",
      note:      "Order created",
      updatedBy: null,
      role:      "system" as ActorRole,
      changedAt: new Date(),
    }],
  }));
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface VendorOrderFilters {
  vendorId: string;
  status?:  VendorOrderStatus;
  page?:    number;
  limit?:   number;
  cursor?:  string;
}

export interface VendorOrdersResult {
  data:       VendorOrder[];
  // Offset mode
  total?:      number;
  page?:       number;
  totalPages?: number;
  // Cursor mode
  nextCursor?: string;
  hasMore?:    boolean;
}

export async function getVendorOrders(filters: VendorOrderFilters): Promise<VendorOrdersResult> {
  await connectDB();
  const { vendorId, status, page = 1, limit = 20, cursor: rawCursor } = filters;

  const query: Record<string, unknown> = {
    vendorId: new mongoose.Types.ObjectId(vendorId),
  };
  if (status && VENDOR_ORDER_STATUSES.includes(status)) {
    query.status = status;
  }

  // ── Keyset mode ─────────────────────────────────────────────────────────────
  const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

  let rawDocs: Record<string, unknown>[];
  let nextCursor: string | undefined;
  let hasMore = false;
  let total: number | undefined;

  if (cursorObj) {
    const result = await findKeyset({
      model:  VendorOrderModel,
      filter: query,
      cursor: cursorObj,
      limit,
    });
    rawDocs    = result.docs;
    nextCursor = result.nextCursor;
    hasMore    = result.hasMore;
  } else {
    // ── Offset mode (backward compatible) ──────────────────────────────────
    const skip = (page - 1) * limit;
    const [offsetDocs, countResult] = await Promise.all([
      VendorOrderModel.find(query)
        .sort(COMMON_SORT_CONFIGS.newest.sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      VendorOrderModel.countDocuments(query),
    ]);
    rawDocs = offsetDocs as Record<string, unknown>[];
    total   = countResult;
  }

  // Populate delivery info from parent orders so vendor can see customer details
  const parentOrderIds = [...new Set(
    (rawDocs as unknown as Array<{ parentOrderId: mongoose.Types.ObjectId }>)
      .map((d) => d.parentOrderId),
  )];

  const parentOrders = await OrderModel
    .find({ _id: { $in: parentOrderIds } })
    .select("_id delivery")
    .lean<Array<{
      _id: mongoose.Types.ObjectId;
      delivery: { fullName: string; email: string; phone: string; address: string; city: string; postcode: string };
    }>>();

  const deliveryByOrderId = new Map(
    parentOrders.map((o) => [o._id.toString(), o.delivery]),
  );

  const vendorOrders = (rawDocs as unknown as Record<string, unknown>[]).map((doc) => {
    const vo       = toVendorOrder(doc);
    const delivery = deliveryByOrderId.get(vo.parentOrderId);
    if (delivery) vo.delivery = delivery;
    return vo;
  });

  if (cursorObj) {
    return { data: vendorOrders, nextCursor, hasMore };
  }
  return {
    data:       vendorOrders,
    total,
    page,
    totalPages: Math.ceil((total ?? 0) / limit),
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

// Re-export the central vendor transition map for consumers that imported from here.
export { CENTRAL_VENDOR_TRANSITIONS as VENDOR_TRANSITIONS };

export async function updateVendorOrderStatus(
  vendorOrderId: string,
  vendorId:      string,
  newStatus:     VendorOrderStatus,
  updatedBy?:    string | null,
  note?:         string,
): Promise<VendorOrder | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(vendorOrderId)) return null;

  const current = await VendorOrderModel.findOne({
    _id:      new mongoose.Types.ObjectId(vendorOrderId),
    vendorId: new mongoose.Types.ObjectId(vendorId),
  }).lean<{ status: VendorOrderStatus }>();

  if (!current) return null;

  const { valid, error } = validateStatusTransition(current.status, newStatus, "vendor");
  if (!valid) throw new Error(error);

  const doc = await VendorOrderModel.findByIdAndUpdate(
    vendorOrderId,
    {
      status: newStatus,
      $push:  {
        statusHistory: {
          status:    newStatus,
          note:      note ?? "",
          updatedBy: updatedBy ?? null,
          role:      "vendor" as ActorRole,
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
  updatedBy?:    string,
): Promise<VendorOrder | null> {
  return updateVendorOrderStatus(vendorOrderId, vendorId, "ACCEPTED", updatedBy ?? null, "Order accepted by vendor");
}

export async function rejectVendorOrder(
  vendorOrderId: string,
  vendorId:      string,
  reason:        string,
  updatedBy?:    string,
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
          updatedBy: updatedBy ?? null,
          role:      "vendor" as ActorRole,
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
  updatedBy?:    string,
): Promise<VendorOrder | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(vendorOrderId)) return null;

  // Only PENDING sub-orders can be cancelled by vendor (reject before accepting)
  const doc = await VendorOrderModel.findOneAndUpdate(
    {
      _id:      new mongoose.Types.ObjectId(vendorOrderId),
      vendorId: new mongoose.Types.ObjectId(vendorId),
      status:   "PENDING",
    },
    {
      status:             "CANCELLED",
      cancellationReason: reason,
      $push: {
        statusHistory: {
          status:    "CANCELLED",
          note:      reason,
          updatedBy: updatedBy ?? null,
          role:      "vendor" as ActorRole,
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
  updatedBy?:    string | null,
  note?:         string,
): Promise<VendorOrder | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(vendorOrderId)) return null;

  if (!VENDOR_ORDER_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid vendor order status: ${newStatus}`);
  }

  // Validate admin transition (enforces no truly nonsensical jumps, e.g. REFUNDED → PENDING)
  const current = await VendorOrderModel.findById(vendorOrderId)
    .select("status").lean<{ status: VendorOrderStatus }>();
  if (!current) return null;

  const { valid, error } = validateStatusTransition(current.status, newStatus, "admin");
  if (!valid) throw new Error(error);

  const doc = await VendorOrderModel.findByIdAndUpdate(
    vendorOrderId,
    {
      status: newStatus,
      $push: {
        statusHistory: {
          status:    newStatus,
          note:      note ?? "Status updated by admin",
          updatedBy: updatedBy ?? null,
          role:      "admin" as ActorRole,
          changedAt: new Date(),
        },
      },
    },
    { new: true },
  ).lean();

  if (!doc) return null;
  return toVendorOrder(doc as unknown as Record<string, unknown>);
}
