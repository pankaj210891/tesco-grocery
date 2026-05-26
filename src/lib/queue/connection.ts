/**
 * IORedis connection factory for BullMQ.
 *
 * This connection is separate from the Upstash REST client used for caching
 * and rate-limiting. BullMQ requires a TCP Redis connection (ioredis); Upstash
 * REST is HTTP-only and incompatible with BullMQ internals.
 *
 * Configure via the REDIS_URL environment variable:
 *   redis://localhost:6379           (local development)
 *   rediss://:token@host:6380        (Upstash TLS / production)
 *
 * When REDIS_URL is absent all queue operations degrade gracefully to direct
 * async execution, preserving the existing fire-and-forget behaviour.
 */

import IORedis from "ioredis";
import logger from "@/lib/logger";

let _connection: IORedis | null | undefined; // undefined = not yet resolved

/**
 * Returns a shared ioredis client suitable for BullMQ producers (Queue) and
 * consumers (Worker).  Returns null when REDIS_URL is not configured so that
 * all callers can degrade gracefully without throwing.
 *
 * Each Node.js process (Next.js server, worker process) gets its own
 * singleton — module caching ensures a single connection per process.
 */
export function getQueueConnection(): IORedis | null {
  if (_connection !== undefined) return _connection;

  const url = process.env.REDIS_URL;
  if (!url) {
    _connection = null;
    return null;
  }

  try {
    _connection = new IORedis(url, {
      // BullMQ requirement: disable the per-command retry limit so the client
      // does not give up before BullMQ's own retry logic can kick in.
      maxRetriesPerRequest: null,
      // Do not block module init waiting for the TCP handshake; the first
      // command will trigger the connection.
      enableReadyCheck: false,
      lazyConnect: true,
      // TLS is auto-detected from rediss:// scheme; the empty object enables it.
      ...(url.startsWith("rediss://") && { tls: {} }),
    });

    _connection.on("error", (err: Error) => {
      logger.error({ err }, "[queue:connection] Redis error");
    });

    _connection.on("connect", () => {
      logger.info("[queue:connection] Connected to Redis");
    });

    _connection.on("reconnecting", (delay: number) => {
      logger.warn({ delay }, "[queue:connection] Reconnecting to Redis");
    });
  } catch (err) {
    logger.error({ err }, "[queue:connection] Failed to initialise Redis client");
    _connection = null;
  }

  return _connection;
}

export function isQueueConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
