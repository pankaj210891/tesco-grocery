/**
 * Vendor notification job producers.
 *
 * Currently covers:
 *  - notify-vendor-new-order : send a new-order email to every vendor that has
 *                              items in a newly placed parent order
 *
 * Previously `void fireVendorNewOrderNotifications()` in order.service.ts.
 * The Map-based vendorGroups structure is serialised to an array before being
 * written to Redis.
 *
 * Retry policy: 5 attempts, exponential back-off (2 s → 4 s → 8 s → 16 s → 32 s).
 */

import { getVendorNotificationsQueue } from "@/lib/queue/queues";
import type { VendorGroupForQueue, VendorNewOrderJobData } from "@/lib/queue/types";
import logger from "@/lib/logger";

export type { VendorGroupForQueue };

const VENDOR_JOB_OPTIONS = {
  attempts: 5,
  backoff:  { type: "exponential" as const, delay: 2_000 },
} as const;

// ── notify-vendor-new-order ───────────────────────────────────────────────────

/**
 * Enqueues one job per new order that dispatches email notifications to all
 * participating vendors.
 *
 * @param orderId       Parent order MongoDB id (used in email dashboard link)
 * @param orderNumber   Human-readable order number
 * @param vendorGroups  Serialisable array built from the Map<vendorId, items>
 *                      inside order.service.ts
 */
export async function enqueueVendorNewOrderNotifications(
  orderId:      string,
  orderNumber:  string,
  vendorGroups: VendorGroupForQueue[],
): Promise<void> {
  if (vendorGroups.length === 0) return;

  const dashboardBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const queue         = getVendorNotificationsQueue();
  const data: VendorNewOrderJobData = { orderId, orderNumber, dashboardBase, vendorGroups };

  if (!queue) {
    void runVendorNewOrderNotifications(data).catch((err) =>
      logger.error({ err, orderId }, "[vendor.jobs] Fallback vendor notification failed"),
    );
    return;
  }

  try {
    await queue.add("notify-vendor-new-order", data, VENDOR_JOB_OPTIONS);
  } catch (err) {
    logger.error({ err, orderId }, "[vendor.jobs] Failed to enqueue vendor notification — falling back");
    void runVendorNewOrderNotifications(data).catch((e) =>
      logger.error({ err: e }, "[vendor.jobs] Fallback also failed"),
    );
  }
}

/**
 * Direct execution path used by both the queue fallback and the processor.
 * Mirrors the logic previously in `fireVendorNewOrderNotifications()`.
 */
export async function runVendorNewOrderNotifications(data: VendorNewOrderJobData): Promise<void> {
  const { orderId, orderNumber, dashboardBase, vendorGroups } = data;

  const VendorModel = (await import("@/lib/db/models/vendor.model")).default;
  const { connectDB } = await import("@/lib/db/mongoose");
  const { sendVendorNewOrder } = await import("@/services/email.service");

  await connectDB();

  const vendorIds = vendorGroups.map((g) => g.vendorId);
  const vendors   = await VendorModel
    .find({ _id: { $in: vendorIds } })
    .select("_id email name")
    .lean<Array<{ _id: { toString(): string }; email: string; name: string }>>();

  const results = await Promise.allSettled(
    vendors.map(async (vendor) => {
      const group = vendorGroups.find((g) => g.vendorId === vendor._id.toString());
      if (!group) return;

      await sendVendorNewOrder(vendor.email, {
        vendorName:        vendor.name,
        vendorOrderId:     orderId,
        parentOrderNumber: orderNumber,
        items:             group.items,
        subtotal:          group.subtotal,
        dashboardUrl:      `${dashboardBase}/vendor/orders`,
      });
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    logger.error(
      { orderId, failedCount: failed.length, total: results.length },
      "[vendor.jobs] Some vendor notifications failed",
    );
    // Throw so BullMQ retries the whole job (idempotent — already-sent emails
    // will produce duplicate notifications on retry which is acceptable vs
    // missing notifications entirely).
    if (failed.length === results.length) {
      throw new Error(`All ${failed.length} vendor notifications failed`);
    }
  }
}
