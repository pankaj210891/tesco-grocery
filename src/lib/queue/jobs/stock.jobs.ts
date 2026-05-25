/**
 * Stock update job producers.
 *
 * Covers two operations:
 *  - mark-out-of-stock : post-transaction cleanup after order creation
 *  - restore-stock     : inventory restore after vendor cancel / reject
 *
 * Both were previously fire-and-forget (`void fn()`).  With BullMQ they are
 * persisted in Redis and retried on failure, preventing silent inventory drift.
 *
 * Retry policy: 3 attempts, exponential back-off (1 s → 2 s → 4 s).
 */

import { getStockUpdatesQueue } from "@/lib/queue/queues";
import type { StockItem, MarkOutOfStockJobData, RestoreStockJobData } from "@/lib/queue/types";
import logger from "@/lib/logger";

const STOCK_JOB_OPTIONS = {
  attempts: 3,
  backoff:  { type: "exponential" as const, delay: 1_000 },
} as const;

// ── mark-out-of-stock ─────────────────────────────────────────────────────────

/**
 * Enqueues a job to mark products/variants as inStock=false when their
 * stockQuantity has reached 0 after an order was placed.
 *
 * Called from order.service.ts after the MongoDB transaction commits.
 * Fallback: runs markOutOfStockProducts() directly (async, non-blocking).
 */
export async function enqueueMarkOutOfStock(items: StockItem[]): Promise<void> {
  if (items.length === 0) return;

  const queue = getStockUpdatesQueue();
  const data: MarkOutOfStockJobData = { jobType: "mark-out-of-stock", items };

  if (!queue) {
    const { markOutOfStockProducts } = await import("@/services/inventory.service");
    void markOutOfStockProducts(items).catch((err) =>
      logger.error({ err }, "[stock.jobs] Fallback markOutOfStockProducts failed"),
    );
    return;
  }

  try {
    await queue.add("mark-out-of-stock", data, STOCK_JOB_OPTIONS);
  } catch (err) {
    logger.error({ err }, "[stock.jobs] Failed to enqueue mark-out-of-stock — falling back");
    const { markOutOfStockProducts } = await import("@/services/inventory.service");
    void markOutOfStockProducts(items).catch((e) =>
      logger.error({ err: e }, "[stock.jobs] Fallback also failed"),
    );
  }
}

// ── restore-stock ─────────────────────────────────────────────────────────────

/**
 * Enqueues a job to restore stock quantities when a vendor cancels or rejects
 * a sub-order.
 *
 * Previously a naked `void restoreStock(items)` call — now persisted and
 * retried so inventory is never permanently depleted by a cancelled order.
 * Fallback: runs restoreStock() directly (async, non-blocking).
 */
export async function enqueueRestoreStock(items: StockItem[]): Promise<void> {
  if (items.length === 0) return;

  const queue = getStockUpdatesQueue();
  const data: RestoreStockJobData = { jobType: "restore-stock", items };

  if (!queue) {
    const { restoreStock } = await import("@/services/inventory.service");
    void restoreStock(items).catch((err) =>
      logger.error({ err }, "[stock.jobs] Fallback restoreStock failed"),
    );
    return;
  }

  try {
    await queue.add("restore-stock", data, STOCK_JOB_OPTIONS);
  } catch (err) {
    logger.error({ err }, "[stock.jobs] Failed to enqueue restore-stock — falling back");
    const { restoreStock } = await import("@/services/inventory.service");
    void restoreStock(items).catch((e) =>
      logger.error({ err: e }, "[stock.jobs] Fallback also failed"),
    );
  }
}
