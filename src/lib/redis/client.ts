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

  // Use `no-cache` instead of the Upstash default `no-store`.
  // `no-store` tells Next.js App Router the route is dynamic, which breaks
  // ISR pages (generateStaticParams + revalidate). For POST requests to
  // Upstash, `no-cache` is functionally identical — HTTP caches never store
  // POST responses — but does not trigger Next.js's static-generation guard.
  _client = url && token ? new Redis({ url, token, cache: "no-cache" }) : null;
  return _client;
}

/** True when Redis credentials are present and the client was created. */
export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}
