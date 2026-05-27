import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis/client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LimiterResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix ms timestamp when the window resets
}

interface Limiter {
  limit(id: string): Promise<LimiterResult>;
}

type Duration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

// ─── No-op fallback ──────────────────────────────────────────────────────────

// Used when UPSTASH_REDIS_REST_URL / TOKEN are not configured (local dev without Redis).
// Always allows the request — rate limiting is silently disabled.
class NoopLimiter implements Limiter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async limit(_identifier: string): Promise<LimiterResult> {
    return { success: true, remaining: 999, reset: 0 };
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeLimiter(requests: number, window: Duration): Limiter {
  const redis = getRedis();
  if (!redis) return new NoopLimiter();

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: "@rl",
    analytics: false,
  });
}

// ─── Limiters ────────────────────────────────────────────────────────────────

export const loginLimiter          = makeLimiter(5,  "15 m"); // 5 attempts / 15 min per IP
export const registerLimiter       = makeLimiter(3,  "1 h");  // 3 sign-ups / hour per IP
export const forgotPasswordLimiter = makeLimiter(3,  "1 h");  // 3 resets / hour per IP
export const paymentLimiter        = makeLimiter(10, "1 m");  // 10 payment ops / min per user
export const searchLimiter         = makeLimiter(30, "1 m");  // 30 search/suggestions per min per IP
export const analyticsLimiter      = makeLimiter(60, "1 h");  // 60 analytics reads per hour per user

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts the best available client IP from the request headers.
 * Works behind Vercel, Cloudflare, and standard reverse proxies.
 */
export function getClientIp(req: Request): string {
  const h = req.headers;
  return (
    (h instanceof Headers
      ? (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim())
      : undefined) ?? "unknown"
  );
}

/**
 * Runs a rate-limit check and returns whether the request is blocked.
 *
 * @returns `{ limited: false }` when allowed.
 *          `{ limited: true, retryAfter }` (seconds) when throttled.
 */
export async function applyRateLimit(
  limiter: Limiter,
  identifier: string
): Promise<{ limited: false } | { limited: true; retryAfter: number }> {
  const result = await limiter.limit(identifier);
  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return { limited: true, retryAfter };
  }
  return { limited: false };
}
