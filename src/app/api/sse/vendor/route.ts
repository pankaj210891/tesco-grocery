/**
 * GET /api/sse/vendor?token=<jwt>
 *
 * Server-Sent Events stream for the vendor dashboard.
 * Streams live order updates scoped to the authenticated vendor.
 *
 * Events:
 *  • connected                    — on open
 *  • heartbeat                    — every 30 s
 *  • vendor_order.status_updated  — one of vendor's sub-orders changed status
 *  • vendor.new_order             — a new order was assigned to this vendor
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import VendorModel from "@/lib/db/models/vendor.model";
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

  if (auth.role !== "vendor" && auth.role !== "admin") {
    return new Response("Vendor access required", { status: 403 });
  }

  // ─── Resolve vendor ID ────────────────────────────────────────────────────
  // JWT contains userId, not vendorId — look up the vendor profile.
  await connectDB();
  const vendor = await VendorModel
    .findOne({ ownerId: auth.userId })
    .select("_id")
    .lean<{ _id: { toString(): string } }>();

  if (!vendor && auth.role !== "admin") {
    return new Response("Vendor profile not found", { status: 404 });
  }

  const vendorId = vendor?._id.toString() ?? auth.userId;
  const channel  = SSE_CHANNELS.vendor(vendorId);

  let cleanup:   (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  function teardown() {
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
    cleanup?.();
    cleanup = null;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      ctrl.enqueue(encodeRaw(
        `retry: ${RETRY_MS}\nevent: connected\ndata: ${JSON.stringify({ vendorId })}\n\n`,
      ));

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
