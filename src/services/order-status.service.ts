import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import OrderModel from "@/lib/db/models/order.model";
import type { VendorOrderStatus, ParentOrderStatus } from "@/types";

/**
 * Derives the parent order status from its vendor sub-order statuses.
 *
 * Rules:
 * - All DELIVERED / COMPLETED            → completed
 * - All CANCELLED / REFUNDED             → cancelled
 * - Mix of terminal + active             → partially_delivered / partially_cancelled
 * - Any PENDING still outstanding        → partially_confirmed (some accepted, some not)
 * - All ACCEPTED / past ACCEPTED         → processing
 * - Fallback                             → pending
 */
export function deriveParentStatus(
  vendorStatuses: VendorOrderStatus[],
): ParentOrderStatus {
  if (vendorStatuses.length === 0) return "pending";

  const total     = vendorStatuses.length;
  const delivered = vendorStatuses.filter((s) =>
    s === "DELIVERED" || s === "RETURNED" || s === "REFUNDED"
  ).length;
  const cancelled = vendorStatuses.filter((s) => s === "CANCELLED").length;
  const terminal  = delivered + cancelled;

  if (terminal === total) {
    if (delivered === total)  return "completed";
    if (cancelled === total)  return "cancelled";
    // Mix of delivered and cancelled
    return delivered > 0 ? "partially_delivered" : "partially_cancelled";
  }

  if (terminal > 0) {
    // Some done, some still in progress
    return delivered > 0 ? "partially_delivered" : "partially_cancelled";
  }

  const inFlight = vendorStatuses.filter((s) =>
    s === "PREPARING" || s === "PACKED" || s === "OUT_FOR_DELIVERY"
  ).length;

  if (inFlight > 0) return "processing";

  const accepted = vendorStatuses.filter((s) => s === "ACCEPTED").length;
  const pending  = vendorStatuses.filter((s) => s === "PENDING").length;

  if (accepted > 0 && pending > 0) return "partially_confirmed";
  if (accepted === total)           return "processing";

  return "pending";
}

/**
 * Reads all vendor sub-orders for a parent order, derives the correct
 * parent status, and persists it if changed.
 */
export async function syncParentOrderStatus(parentOrderId: string): Promise<void> {
  await connectDB();
  if (!mongoose.isValidObjectId(parentOrderId)) return;

  const subOrders = await VendorOrderModel
    .find({ parentOrderId: new mongoose.Types.ObjectId(parentOrderId) })
    .select("status")
    .lean<{ status: VendorOrderStatus }[]>();

  if (subOrders.length === 0) return;

  const newStatus = deriveParentStatus(subOrders.map((s) => s.status));

  // Only write if the status has changed (avoids unnecessary document updates)
  await OrderModel.updateOne(
    { _id: parentOrderId, status: { $ne: newStatus } },
    { status: newStatus },
  );
}
