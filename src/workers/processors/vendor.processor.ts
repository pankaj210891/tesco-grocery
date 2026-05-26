/**
 * Vendor notifications queue processor.
 */

import type { Job } from "bullmq";
import type { VendorNotificationJobData } from "@/lib/queue/types";
import { runVendorNewOrderNotifications } from "@/lib/queue/jobs/vendor.jobs";
import logger from "@/lib/logger";

export async function processVendorNotificationJob(job: Job<VendorNotificationJobData>): Promise<void> {
  logger.info(
    { jobId: job.id, orderId: job.data.orderId, vendorCount: job.data.vendorGroups.length },
    "[vendor.processor] Processing vendor notification job",
  );

  await runVendorNewOrderNotifications(job.data);

  logger.info(
    { jobId: job.id, orderId: job.data.orderId },
    "[vendor.processor] Vendor notification job completed",
  );
}
