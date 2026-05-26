/**
 * GET /api/sse/orders/:orderNumber?token=<jwt>
 *
 * Server-Sent Events stream for customer order tracking.
 * EventSource cannot send custom headers, so the JWT is passed as a query param.
 *
 * Events emitted on this stream:
 *  • connected              — on open (one-time)
 *  • heartbeat              — every 30 s (keeps proxy connections alive)
 *  • vendor_order.status_updated — vendor sub-order status changed
 *  • order.status_updated   — parent order status changed (derived)
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import OrderModel from "@/lib/db/models/order.model";
import { verifyToken } from "@/services/auth.service";
import { subscribe, encodeRaw } from "@/lib/sse/broadcaster";
import { SSE_CHANNELS } from "@/lib/sse/emitter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 30_000;
const RETRY_MS     = 5_000;

type Params = { params: Promise<{ orderNumber: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { orderNumber } = await params;

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 401 });

  let auth: ReturnType<typeof verifyToken>;
  try {
    auth = verifyToken(token);
  } catch {
    return new Response("Invalid or expired token", { status: 401 });
  }

  // ─── Ownership check ──────────────────────────────────────────────────────
  // Admins can watch any order; customers can only watch their own.
  await connectDB();
  const order = await OrderModel
    .findOne({ orderNumber })
    .select("userId")
    .lean<{ userId?: { toString(): string } | null }>();

  if (!order) return new Response("Order not found", { status: 404 });

  const isOwner = order.userId?.toString() === auth.userId;
  if (auth.role !== "admin" && !isOwner) {
    return new Response("Forbidden", { status: 403 });
  }

  // ─── Stream ───────────────────────────────────────────────────────────────
  const channel = SSE_CHANNELS.order(orderNumber);
  let cleanup:   (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  function teardown() {
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
    cleanup?.();
    cleanup = null;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      // Initial frame: retry directive + connected event
      ctrl.enqueue(encodeRaw(`retry: ${RETRY_MS}\nevent: connected\ndata: {}\n\n`));

      // Register with broadcaster
      cleanup = await subscribe(channel, ctrl);

      // Heartbeat — keeps load balancers / Nginx from closing idle connections
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
