import { Redis } from "@upstash/redis";

// Module-level singleton — one instance per Node.js process.
// The Upstash REST client is stateless (no socket) so re-creation on HMR is harmless,
// but a single instance avoids unnecessary object allocation across hot reloads.
let _client: Redis | null | undefined; // undefined = not yet resolved

/**
 * Returns the shared Upstash Redis client, or null when credentials are not
 * configured. All callers must treat null as "Redis unavailable" and fall back
 * gracefully — never throw.
 */
export function getRedis(): Redis | null {
  if (_client !== undefined) return _client;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  _client = url && token ? new Redis({ url, token }) : null;
  return _client;
}

/** True when Redis credentials are present and the client was created. */
export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}
