/**
 * Payout queue job producers.
 *
 * Covers two financial operations:
 *  - confirm-earnings      : transition VendorEarning pending → confirmed
 *                            when a vendor marks their sub-order as DELIVERED
 *  - notify-vendor-payout  : send payout notification email after admin
 *                            releases an earning
 *
 * Both were previously fire-and-forget.  Financial operations must not be
 * silently lost — BullMQ gives us persistence, retry, and dead-letter coverage.
 *
 * Retry policy: 5 attempts, exponential back-off (5 s → 10 s → 20 s → 40 s → 80 s).
 */

import { getPayoutQueue } from "@/lib/queue/queues";
import type { ConfirmEarningsJobData, VendorPayoutNotificationJobData } from "@/lib/queue/types";
import logger from "@/lib/logger";

const PAYOUT_JOB_OPTIONS = {
  attempts: 5,
  backoff:  { type: "exponential" as const, delay: 5_000 },
} as const;

// ── confirm-earnings ──────────────────────────────────────────────────────────

/**
 * Enqueues a job to confirm vendor earnings for a delivered order.
 * This is a critical financial state transition — if lost, the vendor
 * cannot receive a payout.
 *
 * Fallback: calls confirmEarningsForOrder() directly (async).
 */
export async function enqueueConfirmEarnings(orderId: string, vendorId?: string): Promise<void> {
  const queue = getPayoutQueue();
  const data: ConfirmEarningsJobData = { jobType: "confirm-earnings", orderId, vendorId };

  if (!queue) {
    const { confirmEarningsForOrder } = await import("@/services/vendor-earning.service");
    void confirmEarningsForOrder(orderId, vendorId).catch((err) =>
      logger.error({ err, orderId, vendorId }, "[payout.jobs] Fallback confirmEarningsForOrder failed"),
    );
    return;
  }

  try {
    await queue.add("confirm-earnings", data, PAYOUT_JOB_OPTIONS);
  } catch (err) {
    logger.error({ err, orderId, vendorId }, "[payout.jobs] Failed to enqueue confirm-earnings — falling back");
    const { confirmEarningsForOrder } = await import("@/services/vendor-earning.service");
    void confirmEarningsForOrder(orderId, vendorId).catch((e) =>
      logger.error({ err: e }, "[payout.jobs] Fallback also failed"),
    );
  }
}

// ── notify-vendor-payout ──────────────────────────────────────────────────────

/**
 * Enqueues a job to notify a vendor that their earnings have been released.
 * Previously `void notifyVendorPayout()` in vendor-earning.service.ts.
 *
 * Fallback: directly fetches vendor and sends payout email.
 */
export async function enqueuePayoutNotification(
  vendorId:     string,
  amount:       number,
  payoutRef:    string,
  orderNumbers: string[],
): Promise<void> {
  const queue = getPayoutQueue();
  const data: VendorPayoutNotificationJobData = {
    jobType: "notify-vendor-payout",
    vendorId,
    amount,
    payoutRef,
    orderNumbers,
  };

  if (!queue) {
    void runPayoutNotification(vendorId, amount, payoutRef, orderNumbers);
    return;
  }

  try {
    await queue.add("notify-vendor-payout", data, PAYOUT_JOB_OPTIONS);
  } catch (err) {
    logger.error({ err, vendorId }, "[payout.jobs] Failed to enqueue notify-vendor-payout — falling back");
    void runPayoutNotification(vendorId, amount, payoutRef, orderNumbers);
  }
}

/** Direct execution used as both the queue fallback and the processor impl. */
export async function runPayoutNotification(
  vendorId:     string,
  amount:       number,
  payoutRef:    string,
  orderNumbers: string[],
): Promise<void> {
  try {
    const VendorModel = (await import("@/lib/db/models/vendor.model")).default;
    const { connectDB } = await import("@/lib/db/mongoose");
    const { sendVendorPayout } = await import("@/services/email.service");

    await connectDB();
    const vendor = await VendorModel
      .findById(vendorId)
      .select("email name")
      .lean<{ email: string; name: string }>();

    if (!vendor?.email) {
      logger.warn({ vendorId }, "[payout.jobs] Vendor email not found — skipping payout notification");
      return;
    }

    await sendVendorPayout(vendor.email, {
      vendorName:   vendor.name,
      amount,
      payoutRef,
      orderNumbers,
    });
  } catch (err) {
    logger.error({ err, vendorId }, "[payout.jobs] runPayoutNotification failed");
    throw err; // re-throw so BullMQ can retry
  }
}
