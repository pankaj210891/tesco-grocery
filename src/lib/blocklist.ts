import { getRedis } from "@/lib/redis/client";

const KEY_PREFIX = "revoked:jti:";

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
