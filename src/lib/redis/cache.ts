/**
 * Reusable cache utilities built on the shared Redis client.
 *
 * Every operation silently degrades to a no-op (read → null, write → void)
 * when Redis is unavailable, so all cache consumers get transparent fallback
 * without any try/catch duplication at the call site.
 */

import { getRedis } from "./client";
import logger from "@/lib/logger";

// ── Primitives ────────────────────────────────────────────────────────────────

/**
 * Read a cached value. Returns null on cache miss OR when Redis is unavailable.
 * The caller cannot distinguish between the two — both result in a DB fetch.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (err) {
    logger.warn({ key, err }, "[cache] GET error — falling back to source");
    return null;
  }
}

/**
 * Write a value with a TTL (seconds). Silent no-op when Redis is unavailable.
 * A write failure never surfaces to the caller; the source-of-truth DB remains authoritative.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    logger.warn({ key, err }, "[cache] SET error — cache not populated");
  }
}

/**
 * Delete one or more cache entries. Silent no-op when Redis is unavailable.
 * Pass multiple keys to batch-delete in a single round-trip.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ keys, err }, "[cache] DEL error — stale entries may persist until TTL");
  }
}

// ── Higher-order helper ───────────────────────────────────────────────────────

/**
 * Cache-aside pattern. Checks the cache first; on miss, calls `fn`, stores the
 * result, and returns it. The result of `fn` is always returned even when the
 * subsequent SET fails — correctness is never sacrificed for caching.
 *
 * @param key        Cache key (use a builder from `keys.ts`)
 * @param ttlSeconds TTL constant from `TTL` in `keys.ts`
 * @param fn         Async function that produces the canonical value from DB
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await fn();
  // Fire-and-forget: do not await the SET — the caller gets its data immediately.
  // A failed SET is logged internally; the caller receives correct data regardless.
  void cacheSet(key, value, ttlSeconds);
  return value;
}

// ── Batch invalidation ────────────────────────────────────────────────────────

/**
 * Invalidate a logical group of cache keys in one call.
 * Wraps `cacheDel` — same graceful-degradation behaviour.
 */
export async function invalidateKeys(keys: readonly string[] | string[]): Promise<void> {
  if (keys.length === 0) return;
  await cacheDel(...keys);
}
