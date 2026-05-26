/**
 * Search analytics hooks.
 *
 * Two complementary stores:
 *  1. Upstash Redis sorted sets — lightweight, synchronous counters for
 *     popular-query and zero-result-query tracking.
 *  2. BullMQ analytics queue — structured event records for downstream
 *     reporting (extends the existing `record-event` job type).
 *
 * All operations are fire-and-forget: errors are logged at warn level and
 * never surface to the caller so search latency is unaffected.
 *
 * Redis keyspace:
 *   ps:search:popular      sorted set  member=query  score=total hits
 *   ps:search:zero-results sorted set  member=query  score=zero-result hits
 */

import { getRedis } from "@/lib/redis/client";
import { getAnalyticsQueue } from "@/lib/queue/queues";
import logger from "@/lib/logger";
import { CacheKey } from "@/lib/redis/keys";

const POPULAR_CAP      = 500;
const ZERO_RESULTS_CAP = 100;

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeForAnalytics(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Record a search execution.
 *
 * - Increments the query's score in `ps:search:popular`.
 * - Trims the sorted set to POPULAR_CAP after each write.
 * - When resultCount === 0, also increments `ps:search:zero-results`.
 * - Enqueues a structured `search` event to the BullMQ analytics queue.
 *
 * Safe to call without await.
 */
export async function logSearchQuery(
  q: string,
  resultCount: number,
  userId?: string,
): Promise<void> {
  const normalized = normalizeForAnalytics(q);
  if (!normalized) return;

  // BullMQ structured event (non-blocking)
  const analyticsQueue = getAnalyticsQueue();
  if (analyticsQueue) {
    void analyticsQueue
      .add("record-event", {
        event:      "search",
        userId,
        properties: { query: normalized, resultCount },
        timestamp:  new Date().toISOString(),
      })
      .catch((err) =>
        logger.warn({ err, normalized }, "[search-analytics] queue enqueue failed"),
      );
  }

  // Redis sorted-set counters
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.zincrby(CacheKey.searchPopular(), 1, normalized);
    // Keep only the top POPULAR_CAP entries (remove rank 0 → -(cap+1))
    await redis.zremrangebyrank(CacheKey.searchPopular(), 0, -(POPULAR_CAP + 1));

    if (resultCount === 0) {
      await redis.zincrby(CacheKey.searchZeroResults(), 1, normalized);
      await redis.zremrangebyrank(
        CacheKey.searchZeroResults(),
        0,
        -(ZERO_RESULTS_CAP + 1),
      );
    }
  } catch (err) {
    logger.warn({ err, normalized }, "[search-analytics] redis write failed");
  }
}

/**
 * Record a user clicking on a search result.
 * Enqueued via BullMQ; does not touch Redis directly.
 *
 * Safe to call without await.
 */
export async function logSearchClick(
  q: string,
  productId: string,
  position: number,
  userId?: string,
): Promise<void> {
  const analyticsQueue = getAnalyticsQueue();
  if (!analyticsQueue) return;

  void analyticsQueue
    .add("record-event", {
      event:      "search_click",
      userId,
      properties: {
        query:     normalizeForAnalytics(q),
        productId,
        position,
      },
      timestamp: new Date().toISOString(),
    })
    .catch((err) =>
      logger.warn({ err }, "[search-analytics] click enqueue failed"),
    );
}

/**
 * Return the top-N most searched queries.
 * Reads from the `ps:search:popular` sorted set in descending score order.
 * Returns an empty array when Redis is unavailable or the set is empty.
 */
export async function getPopularSearches(limit = 8): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    // zrange with rev:true returns highest-score members first
    const results = await redis.zrange(CacheKey.searchPopular(), 0, limit - 1, {
      rev: true,
    });
    return (results as string[]).filter(Boolean);
  } catch (err) {
    logger.warn({ err }, "[search-analytics] getPopularSearches failed");
    return [];
  }
}
