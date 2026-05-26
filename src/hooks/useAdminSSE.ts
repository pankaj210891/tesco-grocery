"use client";

import { useEffect, useRef } from "react";
import type { VendorOrderStatus } from "@/types";

export interface AdminSSENewOrderEvent {
  orderNumber: string;
  total:       number;
  createdAt:   string;
}

export interface AdminSSEVendorOrderEvent {
  vendorOrderId:     string;
  parentOrderNumber: string;
  vendorId:          string;
  status:            VendorOrderStatus;
  updatedAt:         string;
}

interface UseAdminSSEOptions {
  token:           string | null;
  enabled?:        boolean;
  onNewOrder?:     (payload: AdminSSENewOrderEvent) => void;
  onOrderUpdated?: (payload: AdminSSEVendorOrderEvent) => void;
}

/**
 * Opens an SSE stream on /api/sse/admin for the admin dashboard.
 * Notifies of new orders and any vendor order status changes across the platform.
 */
export function useAdminSSE({
  token,
  enabled = true,
  onNewOrder,
  onOrderUpdated,
}: UseAdminSSEOptions): void {
  const esRef            = useRef<EventSource | null>(null);
  const onNewOrderRef     = useRef(onNewOrder);
  const onOrderUpdatedRef = useRef(onOrderUpdated);

  useEffect(() => { onNewOrderRef.current     = onNewOrder;     }, [onNewOrder]);
  useEffect(() => { onOrderUpdatedRef.current = onOrderUpdated; }, [onOrderUpdated]);

  useEffect(() => {
    if (!enabled || !token) return;

    const url = `/api/sse/admin?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);
    esRef.current = es;

    es.addEventListener("order.new", (e: MessageEvent) => {
      try {
        onNewOrderRef.current?.(JSON.parse(e.data) as AdminSSENewOrderEvent);
      } catch { /* ignore */ }
    });

    es.addEventListener("vendor_order.status_updated", (e: MessageEvent) => {
      try {
        onOrderUpdatedRef.current?.(JSON.parse(e.data) as AdminSSEVendorOrderEvent);
      } catch { /* ignore */ }
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [token, enabled]);
}
