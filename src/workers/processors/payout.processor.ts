/**
 * Payout queue processor.
 * Handles confirm-earnings and notify-vendor-payout jobs.
 */

import type { Job } from "bullmq";
import type { PayoutJobData } from "@/lib/queue/types";
import { runPayoutNotification } from "@/lib/queue/jobs/payout.jobs";
import logger from "@/lib/logger";

export async function processPayoutJob(job: Job<PayoutJobData>): Promise<void> {
  const { jobType } = job.data;

  logger.info({ jobId: job.id, jobType }, "[payout.processor] Processing payout job");

  switch (jobType) {
    case "confirm-earnings": {
      const { orderId, vendorId } = job.data;
      const { confirmEarningsForOrder } = await import("@/services/vendor-earning.service");
      await confirmEarningsForOrder(orderId, vendorId);
      break;
    }
    case "notify-vendor-payout": {
      const { vendorId, amount, payoutRef, orderNumbers } = job.data;
      await runPayoutNotification(vendorId, amount, payoutRef, orderNumbers);
      break;
    }
    default: {
      const exhaustive: never = jobType;
      logger.error({ jobType: exhaustive }, "[payout.processor] Unknown jobType — job discarded");
    }
  }

  logger.info({ jobId: job.id, jobType }, "[payout.processor] Payout job completed");
}
