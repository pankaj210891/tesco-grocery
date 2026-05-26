"use client";

import { useEffect, useRef } from "react";
import type { VendorOrderStatus } from "@/types";

export interface VendorSSEOrderEvent {
  vendorOrderId:     string;
  parentOrderNumber: string;
  vendorId:          string;
  status:            VendorOrderStatus;
  updatedAt:         string;
}

export interface VendorSSENewOrderEvent {
  orderNumber: string;
  total:       number;
  createdAt:   string;
}

interface UseVendorSSEOptions {
  token:           string | null;
  enabled?:        boolean;
  onOrderUpdated?: (payload: VendorSSEOrderEvent) => void;
  onNewOrder?:     (payload: VendorSSENewOrderEvent) => void;
}

/**
 * Opens an SSE stream on /api/sse/vendor for the vendor dashboard.
 * Notifies of new orders and status changes on vendor sub-orders.
 */
export function useVendorSSE({
  token,
  enabled = true,
  onOrderUpdated,
  onNewOrder,
}: UseVendorSSEOptions): void {
  const esRef            = useRef<EventSource | null>(null);
  const onOrderUpdatedRef = useRef(onOrderUpdated);
  const onNewOrderRef     = useRef(onNewOrder);

  useEffect(() => { onOrderUpdatedRef.current = onOrderUpdated; }, [onOrderUpdated]);
  useEffect(() => { onNewOrderRef.current     = onNewOrder;     }, [onNewOrder]);

  useEffect(() => {
    if (!enabled || !token) return;

    const url = `/api/sse/vendor?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);
    esRef.current = es;

    es.addEventListener("vendor_order.status_updated", (e: MessageEvent) => {
      try {
        onOrderUpdatedRef.current?.(JSON.parse(e.data) as VendorSSEOrderEvent);
      } catch { /* ignore */ }
    });

    es.addEventListener("vendor.new_order", (e: MessageEvent) => {
      try {
        onNewOrderRef.current?.(JSON.parse(e.data) as VendorSSENewOrderEvent);
      } catch { /* ignore */ }
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [token, enabled]);
}
