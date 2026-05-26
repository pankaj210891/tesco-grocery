"use client";

import { useEffect, useRef } from "react";
import type { ParentOrderStatus, VendorOrderStatus } from "@/types";

export interface OrderSSEStatusEvent {
  orderNumber: string;
  status:      ParentOrderStatus;
  updatedAt:   string;
}

export interface VendorOrderSSEStatusEvent {
  vendorOrderId:     string;
  parentOrderNumber: string;
  vendorId:          string;
  status:            VendorOrderStatus;
  updatedAt:         string;
}

interface UseOrderSSEOptions {
  orderNumber:     string;
  token:           string | null;
  enabled?:        boolean;
  onOrderStatus?:  (payload: OrderSSEStatusEvent) => void;
  onVendorStatus?: (payload: VendorOrderSSEStatusEvent) => void;
}

/**
 * Opens an SSE stream on /api/sse/orders/:orderNumber for live order tracking.
 *
 * Callbacks are stored in refs so changing them never re-opens the connection.
 * EventSource handles reconnection automatically using the server's retry: directive.
 */
export function useOrderSSE({
  orderNumber,
  token,
  enabled = true,
  onOrderStatus,
  onVendorStatus,
}: UseOrderSSEOptions): void {
  const esRef            = useRef<EventSource | null>(null);
  const onOrderStatusRef  = useRef(onOrderStatus);
  const onVendorStatusRef = useRef(onVendorStatus);

  // Keep refs current without re-opening the connection
  useEffect(() => { onOrderStatusRef.current  = onOrderStatus;  }, [onOrderStatus]);
  useEffect(() => { onVendorStatusRef.current = onVendorStatus; }, [onVendorStatus]);

  useEffect(() => {
    if (!enabled || !token || !orderNumber) return;

    const url = `/api/sse/orders/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);
    esRef.current = es;

    es.addEventListener("order.status_updated", (e: MessageEvent) => {
      try {
        onOrderStatusRef.current?.(JSON.parse(e.data) as OrderSSEStatusEvent);
      } catch { /* ignore malformed */ }
    });

    es.addEventListener("vendor_order.status_updated", (e: MessageEvent) => {
      try {
        onVendorStatusRef.current?.(JSON.parse(e.data) as VendorOrderSSEStatusEvent);
      } catch { /* ignore malformed */ }
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [orderNumber, token, enabled]);
}
