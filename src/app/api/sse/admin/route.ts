/**
 * GET /api/sse/admin?token=<jwt>
 *
 * Server-Sent Events stream for the admin dashboard.
 * Streams marketplace-wide events to authenticated admins.
 *
 * Events:
 *  • connected                    — on open
 *  • heartbeat                    — every 30 s
 *  • order.new                    — a new order was placed
 *  • vendor_order.status_updated  — any vendor sub-order changed status
 */

import { NextRequest } from "next/server";
import { verifyToken } from "@/services/auth.service";
import { subscribe, encodeRaw } from "@/lib/sse/broadcaster";
import { SSE_CHANNELS } from "@/lib/sse/emitter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 30_000;
const RETRY_MS     = 5_000;

export async function GET(req: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 401 });

  let auth: ReturnType<typeof verifyToken>;
  try {
    auth = verifyToken(token);
  } catch {
    return new Response("Invalid or expired token", { status: 401 });
  }

  if (auth.role !== "admin") {
    return new Response("Admin access required", { status: 403 });
  }

  const channel = SSE_CHANNELS.admin();
  let cleanup:   (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  function teardown() {
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
    cleanup?.();
    cleanup = null;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      ctrl.enqueue(encodeRaw(`retry: ${RETRY_MS}\nevent: connected\ndata: {}\n\n`));

      cleanup = await subscribe(channel, ctrl);

      heartbeat = setInterval(() => {
        try {
          ctrl.enqueue(encodeRaw(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`));
        } catch {
          teardown();
        }
      }, HEARTBEAT_MS);
    },
    cancel() { teardown(); },
  });

  req.signal.addEventListener("abort", teardown, { once: true });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type":      "text/event-stream; charset=utf-8",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
