/**
 * Typed SSE event emitters.
 *
 * All functions are fire-and-forget safe — callers should prefix with `void`
 * so they never block API route responses.
 *
 * Channel layout:
 *   sse:order:{orderNumber}   — customer tracks their specific order
 *   sse:vendor:{vendorId}     — vendor dashboard (new orders, status changes)
 *   sse:admin                 — admin dashboard (new orders, any status change)
 */

import { publish, newEventId } from "@/lib/sse/broadcaster";
import { connectDB } from "@/lib/db/mongoose";
import OrderModel from "@/lib/db/models/order.model";
import type { VendorOrderStatus, ParentOrderStatus } from "@/types";

// ─── Channel helpers ──────────────────────────────────────────────────────────

export const SSE_CHANNELS = {
  order:  (orderNumber: string) => `sse:order:${orderNumber}`,
  vendor: (vendorId: string)    => `sse:vendor:${vendorId}`,
  admin:  ()                    => "sse:admin",
} as const;

// ─── Shared payload shapes (consumed by frontend hooks too) ───────────────────

export interface SSEVendorOrderPayload {
  vendorOrderId:     string;
  parentOrderNumber: string;
  vendorId:          string;
  status:            VendorOrderStatus;
  updatedAt:         string;
}

export interface SSEOrderStatusPayload {
  orderNumber: string;
  status:      ParentOrderStatus;
  updatedAt:   string;
}

export interface SSENewOrderPayload {
  orderNumber: string;
  total:       number;
  createdAt:   string;
}

// ─── Emitter: after any vendor sub-order status change ────────────────────────
//
// Emits to three channels simultaneously:
//  1. sse:order:{orderNumber}  — customer watching their order (two events)
//     a. vendor_order.status_updated — vendor sub-order status
//     b. order.status_updated        — derived parent order status (DB fetch)
//  2. sse:vendor:{vendorId}    — vendor dashboard
//  3. sse:admin                — admin dashboard overview

export async function emitAfterVendorStatusChange(
  vendorOrderId:     string,
  parentOrderNumber: string,
  vendorId:          string,
  newStatus:         VendorOrderStatus,
): Promise<void> {
  const updatedAt = new Date().toISOString();

  const vendorPayload: SSEVendorOrderPayload = {
    vendorOrderId,
    parentOrderNumber,
    vendorId,
    status: newStatus,
    updatedAt,
  };

  // Fetch parent order status (derived after syncParentOrderStatus has run).
  // This is a lightweight lean query on a single indexed field.
  let parentStatus: ParentOrderStatus | null = null;
  try {
    await connectDB();
    const parent = await OrderModel
      .findOne({ orderNumber: parentOrderNumber })
      .select("status")
      .lean<{ status: ParentOrderStatus }>();
    parentStatus = parent?.status ?? null;
  } catch {
    // Non-critical — we still emit the vendor order event even if parent fetch fails
  }

  const emissions: Promise<void>[] = [
    // Customer order tracking — vendor sub-order status
    publish(SSE_CHANNELS.order(parentOrderNumber), {
      id:    newEventId(),
      event: "vendor_order.status_updated",
      data:  vendorPayload,
    }),
    // Vendor dashboard
    publish(SSE_CHANNELS.vendor(vendorId), {
      id:    newEventId(),
      event: "vendor_order.status_updated",
      data:  vendorPayload,
    }),
    // Admin overview
    publish(SSE_CHANNELS.admin(), {
      id:    newEventId(),
      event: "vendor_order.status_updated",
      data:  vendorPayload,
    }),
  ];

  // Also emit parent order status to customer tracking channel if we got it
  if (parentStatus) {
    const orderPayload: SSEOrderStatusPayload = {
      orderNumber: parentOrderNumber,
      status:      parentStatus,
      updatedAt,
    };
    emissions.push(
      publish(SSE_CHANNELS.order(parentOrderNumber), {
        id:    newEventId(),
        event: "order.status_updated",
        data:  orderPayload,
      }),
    );
  }

  await Promise.allSettled(emissions);
}

// ─── Emitter: new order placed ────────────────────────────────────────────────
//
// Called from order.service.ts after a successful order creation.
// Notifies:
//  • Admin dashboard (new order alert)
//  • Each involved vendor's dashboard (new sub-order)

export async function emitNewOrder(
  orderNumber: string,
  total:       number,
  vendorIds:   string[],
): Promise<void> {
  const payload: SSENewOrderPayload = {
    orderNumber,
    total,
    createdAt: new Date().toISOString(),
  };

  await Promise.allSettled([
    publish(SSE_CHANNELS.admin(), {
      id:    newEventId(),
      event: "order.new",
      data:  payload,
    }),
    ...vendorIds.map((vid) =>
      publish(SSE_CHANNELS.vendor(vid), {
        id:    newEventId(),
        event: "vendor.new_order",
        data:  payload,
      }),
    ),
  ]);
}
