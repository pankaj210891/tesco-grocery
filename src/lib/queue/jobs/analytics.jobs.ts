/**
 * Analytics event job producers.
 *
 * Best-effort queue: analytics events are non-critical.  If Redis is down or
 * the job fails, it is logged and dropped — the business flow is never blocked.
 * No fallback execution (analytics loss is acceptable; extra complexity is not).
 *
 * Retry policy: 2 attempts, fixed delay (5 s).
 * Failed jobs still go to dead-letter for audit purposes.
 */

import { getAnalyticsQueue } from "@/lib/queue/queues";
import type { AnalyticsEventJobData } from "@/lib/queue/types";
import logger from "@/lib/logger";

const ANALYTICS_JOB_OPTIONS = {
  attempts: 2,
  backoff:  { type: "fixed" as const, delay: 5_000 },
} as const;

/**
 * Enqueues a structured analytics event.
 *
 * @param event      Event name, e.g. "order.created", "user.registered"
 * @param properties Arbitrary key-value metadata for the event
 * @param userId     Optional authenticated user ID
 */
export async function enqueueAnalyticsEvent(
  event:      string,
  properties: Record<string, unknown>,
  userId?:    string,
): Promise<void> {
  const queue = getAnalyticsQueue();
  if (!queue) return; // no-op when Redis not configured

  const data: AnalyticsEventJobData = {
    event,
    userId,
    properties,
    timestamp: new Date().toISOString(),
  };

  try {
    await queue.add("record-event", data, ANALYTICS_JOB_OPTIONS);
  } catch (err) {
    // Analytics failure must never bubble up to the caller.
    logger.warn({ err, event }, "[analytics.jobs] Failed to enqueue analytics event — dropping");
  }
}
