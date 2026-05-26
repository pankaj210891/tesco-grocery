/**
 * SSE Broadcaster — scalable, Redis-backed, in-process fan-out.
 *
 * Architecture:
 *  • In-process registry   Map<channel, Set<controller>>  — zero-latency local delivery
 *  • Redis Pub/Sub layer   (when REDIS_URL is configured)  — cross-process / multi-server
 *
 * When Redis IS available:
 *   publish() → Redis PUBLISH → subscriber's "message" handler → fanOutInProcess()
 *   The publishing process also receives its own message via Redis (round-trip).
 *   Do NOT call fanOutInProcess() directly inside publish() — it would double-deliver.
 *
 * When Redis is NOT available:
 *   publish() → fanOutInProcess() directly (single-server, single-process only).
 *
 * Publisher and subscriber use SEPARATE IORedis instances.
 * IORedis subscriber connections enter a special mode that blocks non-subscribe commands,
 * so they cannot be shared with BullMQ or publishing.
 */

import IORedis from "ioredis";
import { randomUUID } from "crypto";
import logger from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SSEEvent {
  id:     string;
  event:  string;
  data:   unknown;
  retry?: number;
}

export type SSEController = ReadableStreamDefaultController<Uint8Array>;

// ─── Encoder ─────────────────────────────────────────────────────────────────

const _enc = new TextEncoder();

export function formatSSEMessage(event: SSEEvent): string {
  const lines: string[] = [
    `id: ${event.id}`,
    `event: ${event.event}`,
    `data: ${JSON.stringify(event.data)}`,
  ];
  if (event.retry) lines.push(`retry: ${event.retry}`);
  lines.push("", ""); // SSE event terminator: double newline
  return lines.join("\n");
}

export function encodeSSEMessage(event: SSEEvent): Uint8Array {
  return _enc.encode(formatSSEMessage(event));
}

export function encodeRaw(raw: string): Uint8Array {
  return _enc.encode(raw);
}

export function newEventId(): string {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

// ─── In-process registry ──────────────────────────────────────────────────────

const _registry = new Map<string, Set<SSEController>>();

function fanOutInProcess(channel: string, raw: string): void {
  const ctrls = _registry.get(channel);
  if (!ctrls?.size) return;

  const encoded = _enc.encode(raw);
  const dead: SSEController[] = [];

  for (const ctrl of ctrls) {
    try {
      ctrl.enqueue(encoded);
    } catch {
      dead.push(ctrl); // controller closed — remove it
    }
  }

  for (const ctrl of dead) ctrls.delete(ctrl);
  if (ctrls.size === 0) _registry.delete(channel);
}

// ─── Redis connections ────────────────────────────────────────────────────────
// undefined = not yet initialised   null = no REDIS_URL configured

let _publisher:  IORedis | null | undefined;
let _subscriber: IORedis | null | undefined;

const _redisSubs = new Set<string>(); // channels the subscriber has subscribed to

function buildRedisClient(url: string): IORedis {
  return new IORedis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck:     false,
    lazyConnect:          true,
    ...(url.startsWith("rediss://") && { tls: {} }),
  });
}

function getPublisher(): IORedis | null {
  if (_publisher !== undefined) return _publisher;

  const url = process.env.REDIS_URL;
  if (!url) { _publisher = null; return null; }

  _publisher = buildRedisClient(url);
  _publisher.on("error", (err: Error) =>
    logger.warn({ err }, "[sse:pub] Redis publish error"),
  );
  return _publisher;
}

function getSubscriber(): IORedis | null {
  if (_subscriber !== undefined) return _subscriber;

  const url = process.env.REDIS_URL;
  if (!url) { _subscriber = null; return null; }

  _subscriber = buildRedisClient(url);
  _subscriber.on("error", (err: Error) =>
    logger.warn({ err }, "[sse:sub] Redis subscriber error"),
  );
  // Fan out every Redis message to local controllers on that channel
  _subscriber.on("message", (channel: string, message: string) => {
    fanOutInProcess(channel, message);
  });

  return _subscriber;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register a ReadableStream controller to receive events on `channel`.
 * Returns a cleanup function that MUST be called when the SSE connection ends.
 */
export async function subscribe(
  channel:    string,
  controller: SSEController,
): Promise<() => void> {
  if (!_registry.has(channel)) _registry.set(channel, new Set());
  _registry.get(channel)!.add(controller);

  const sub = getSubscriber();
  if (sub && !_redisSubs.has(channel)) {
    _redisSubs.add(channel);
    await sub.subscribe(channel).catch((err: Error) => {
      _redisSubs.delete(channel);
      logger.warn({ err, channel }, "[sse:sub] Redis subscribe failed");
    });
  }

  return () => {
    const ctrls = _registry.get(channel);
    if (!ctrls) return;

    ctrls.delete(controller);

    if (ctrls.size === 0) {
      _registry.delete(channel);
      if (_redisSubs.has(channel)) {
        _redisSubs.delete(channel);
        sub?.unsubscribe(channel).catch(() => { /* ignore */ });
      }
    }
  };
}

/**
 * Publish a typed SSE event to all subscribers of `channel`.
 *
 * With Redis: event is published to Redis, which delivers it to all processes
 * (including the current one) via the subscriber connection. Do NOT call
 * fanOutInProcess() here — that would cause double-delivery on the publisher.
 *
 * Without Redis: event is delivered only to in-process controllers.
 */
export async function publish(channel: string, event: SSEEvent): Promise<void> {
  const raw = formatSSEMessage(event);
  const pub = getPublisher();

  if (pub) {
    await pub.publish(channel, raw).catch((err: Error) => {
      logger.warn({ err, channel }, "[sse:pub] Redis PUBLISH failed — falling back to in-process");
      fanOutInProcess(channel, raw);
    });
  } else {
    fanOutInProcess(channel, raw);
  }
}
