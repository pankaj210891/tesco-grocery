/**
 * Lazy singleton Queue instances for each of the five application queues plus
 * the dead-letter queue.
 *
 * Queues (producers) live inside the Next.js process.  Workers (consumers) are
 * started by the separate `npm run workers` process and share the same Redis
 * keyspace but maintain their own ioredis connections.
 *
 * All getters return null when REDIS_URL is not configured so callers can fall
 * back to direct async execution without branching.
 */

import { Queue } from "bullmq";
import { getQueueConnection } from "./connection";
import type {
  EmailJobData,
  VendorNotificationJobData,
  StockJobData,
  PayoutJobData,
  AnalyticsJobData,
  DeadLetterJobData,
} from "./types";

export const QUEUE_NAMES = {
  EMAIL:                "queue:email",
  VENDOR_NOTIFICATIONS: "queue:vendor-notifications",
  STOCK_UPDATES:        "queue:stock-updates",
  PAYOUT:               "queue:payout",
  ANALYTICS:            "queue:analytics",
  DEAD_LETTER:          "queue:dead-letter",
} as const;

/**
 * Default completed/failed job retention so the Bull Board monitoring UI has
 * data to display without unbounded Redis memory growth.
 */
const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 1000, age: 60 * 60 * 24 * 7  }, // 7 days or 1 000 jobs
  removeOnFail:     { count: 5000, age: 60 * 60 * 24 * 30 }, // 30 days or 5 000 jobs
} as const;

// One Queue instance per name per process.
const _queues = new Map<string, Queue>();

function getOrCreate<T>(name: string): Queue<T> | null {
  const conn = getQueueConnection();
  if (!conn) return null;

  if (!_queues.has(name)) {
    _queues.set(
      name,
      new Queue<T>(name, { connection: conn, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    );
  }
  return _queues.get(name) as Queue<T>;
}

export const getEmailQueue               = (): Queue<EmailJobData>               | null => getOrCreate(QUEUE_NAMES.EMAIL);
export const getVendorNotificationsQueue = (): Queue<VendorNotificationJobData>  | null => getOrCreate(QUEUE_NAMES.VENDOR_NOTIFICATIONS);
export const getStockUpdatesQueue        = (): Queue<StockJobData>               | null => getOrCreate(QUEUE_NAMES.STOCK_UPDATES);
export const getPayoutQueue              = (): Queue<PayoutJobData>              | null => getOrCreate(QUEUE_NAMES.PAYOUT);
export const getAnalyticsQueue           = (): Queue<AnalyticsJobData>           | null => getOrCreate(QUEUE_NAMES.ANALYTICS);
export const getDeadLetterQueue          = (): Queue<DeadLetterJobData>          | null => getOrCreate(QUEUE_NAMES.DEAD_LETTER);
