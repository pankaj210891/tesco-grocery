/**
 * Stock updates queue processor.
 * Handles mark-out-of-stock and restore-stock operations.
 */

import type { Job } from "bullmq";
import type { StockJobData } from "@/lib/queue/types";
import logger from "@/lib/logger";

export async function processStockJob(job: Job<StockJobData>): Promise<void> {
  const { jobType, items } = job.data;

  logger.info({ jobId: job.id, jobType, count: items.length }, "[stock.processor] Processing stock job");

  switch (jobType) {
    case "mark-out-of-stock": {
      const { markOutOfStockProducts } = await import("@/services/inventory.service");
      await markOutOfStockProducts(items);
      break;
    }
    case "restore-stock": {
      const { restoreStock } = await import("@/services/inventory.service");
      await restoreStock(items);
      break;
    }
    default: {
      const exhaustive: never = jobType;
      logger.error({ jobType: exhaustive }, "[stock.processor] Unknown jobType — job discarded");
    }
  }

  logger.info({ jobId: job.id, jobType, count: items.length }, "[stock.processor] Stock job completed");
}
