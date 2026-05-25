import { Redis } from "@upstash/redis";

const KEY_PREFIX = "revoked:jti:";

// Lazily create the Redis client so the module can be imported without
// crashing in environments that haven't set Upstash credentials.
let _redis: Redis | null | undefined; // undefined = not yet resolved

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

/**
 * Mark a JWT as revoked.
 *
 * @param jti        The `jti` claim from the JWT payload.
 * @param ttlSeconds Seconds until the entry expires (should match the token's
 *                   remaining lifetime so Redis auto-cleans old entries).
 */
export async function revokeToken(jti: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return; // no Redis configured — graceful degradation in dev
  await redis.set(`${KEY_PREFIX}${jti}`, "1", { ex: ttlSeconds });
}

/**
 * Returns true if the JWT has been explicitly revoked (e.g. on logout).
 * Always returns false when Redis is not configured.
 */
export async function isTokenRevoked(jti: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const val = await redis.get(`${KEY_PREFIX}${jti}`);
  return val !== null;
}
