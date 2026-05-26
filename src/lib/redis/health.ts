import { getRedis, isRedisConfigured } from "./client";

export interface RedisHealthResult {
  /** Whether Redis responded successfully to a PING. */
  healthy: boolean;
  /** Whether credentials are present (false = Redis intentionally disabled). */
  configured: boolean;
  /** Round-trip latency in milliseconds (only present when configured). */
  latencyMs?: number;
  /** Error message when healthy is false and configured is true. */
  error?: string;
}

/**
 * Performs a PING against the Upstash Redis instance and measures latency.
 *
 * - Not configured → `{ healthy: false, configured: false }` (not an error)
 * - Configured + reachable → `{ healthy: true, configured: true, latencyMs }`
 * - Configured + unreachable → `{ healthy: false, configured: true, error }`
 *
 * Safe to call from health-check endpoints or admin dashboards.
 * Never throws — all errors are captured in the return value.
 */
export async function checkRedisHealth(): Promise<RedisHealthResult> {
  if (!isRedisConfigured()) {
    return { healthy: false, configured: false };
  }

  const redis = getRedis()!;
  const start = Date.now();

  try {
    await redis.ping();
    return { healthy: true, configured: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      healthy:    false,
      configured: true,
      latencyMs:  Date.now() - start,
      error:      err instanceof Error ? err.message : "Unknown Redis error",
    };
  }
}
