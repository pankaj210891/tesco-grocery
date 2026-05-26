"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, Package } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useVendorStore } from "@/store/vendor.store";
import { fetchVendorOrders, updateVendorOrderStatus } from "@/services/vendor.service";
import { toast } from "sonner";
import { useVendorSSE } from "@/hooks/useVendorSSE";
import type { VendorSSEOrderEvent, VendorSSENewOrderEvent } from "@/hooks/useVendorSSE";
import {
  VENDOR_TRANSITIONS,
  TERMINAL_STATUSES,
  STATUS_META,
  type VendorOrderStatus,
} from "@/constants/order-status";

const FILTER_STATUSES: Array<{ label: string; value: string }> = [
  { label: "All",              value: "" },
  { label: "Pending",          value: "PENDING" },
  { label: "Accepted",         value: "ACCEPTED" },
  { label: "Preparing",        value: "PREPARING" },
  { label: "Packed",           value: "PACKED" },
  { label: "Ready for Pickup", value: "READY_FOR_PICKUP" },
  { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
  { label: "Delivered",        value: "DELIVERED" },
  { label: "Cancelled",        value: "CANCELLED" },
];

export default function VendorOrdersPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const {
    orders, ordersMeta, ordersPage, ordersStatus, ordersLoading,
    setOrders, setOrdersPage, setOrdersStatus, setOrdersLoading, updateOrderStatus,
  } = useVendorStore();

  const load = useCallback(async () => {
    if (!token) return;
    setOrdersLoading(true);
    try {
      const res = await fetchVendorOrders(token, ordersPage, 20, ordersStatus);
      setOrders(res.data, { total: res.total, page: res.page, totalPages: res.totalPages });
    } catch {
      toast.error("Failed to load orders. Please refresh the page.");
    } finally {
      setOrdersLoading(false);
    }
  }, [token, ordersPage, ordersStatus, setOrders, setOrdersLoading]);

  useEffect(() => {
    if (!user)                                            { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin")  { router.push("/");     return; }
    void load();
  }, [user, router, load]);

  // ── Live vendor order updates via SSE ──────────────────────────────────────
  useVendorSSE({
    token,
    enabled: !!user && !!token,
    onOrderUpdated: (payload: VendorSSEOrderEvent) => {
      updateOrderStatus(payload.vendorOrderId, payload.status);
    },
    onNewOrder: (payload: VendorSSENewOrderEvent) => {
      toast.info(`New order received: #${payload.orderNumber}`);
      void load(); // reload the list to show the new order
    },
  });

  async function handleStatusUpdate(id: string, newStatus: string) {
    if (!token) return;
    try {
      await updateVendorOrderStatus(token, id, newStatus);
      updateOrderStatus(id, newStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">My Orders</h1>
        {ordersMeta.total > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{ordersMeta.total} total</span>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap">
        {FILTER_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setOrdersStatus(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              ordersStatus === s.value
                ? "bg-[#1a7a4a] text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
            data-testid={`vendor-order-status-${s.value || "all"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
              <tr>
                {["Order", "Customer", "My Items", "City", "Date", "Status", "Update Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {ordersLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No orders yet</td></tr>
              ) : orders.map((order) => {
                const currentStatus = order.status as VendorOrderStatus;
                const isTerminal    = TERMINAL_STATUSES.has(currentStatus);
                // Compute valid next steps from central transition map
                const nextOptions   = (VENDOR_TRANSITIONS[currentStatus] ?? []) as VendorOrderStatus[];
                const meta          = STATUS_META[currentStatus];

                return (
                  <tr key={order._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30" data-testid="vendor-order-row">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                      #{order.parentOrderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {order.delivery?.fullName ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400">{order.delivery?.email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 max-w-[200px]">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                              {item.name}
                              {item.variantLabel && (
                                <span className="text-gray-400 dark:text-gray-500"> · {item.variantLabel}</span>
                              )}
                              {" "}×{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {order.delivery?.city ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(order.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${meta?.bgCls ?? ""} ${meta?.colorCls ?? ""}`}>
                        {meta?.label ?? order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!isTerminal && nextOptions.length > 0 ? (
                        <div className="relative inline-block">
                          <select
                            defaultValue=""
                            key={order._id + order.status}
                            onChange={(e) => {
                              if (e.target.value) void handleStatusUpdate(order._id, e.target.value);
                            }}
                            className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                            data-testid={`vendor-order-update-${order._id}`}
                          >
                            <option value="" disabled>Move to…</option>
                            {nextOptions.map((s) => (
                              <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">
                          {isTerminal ? "Done" : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {ordersMeta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {ordersMeta.page} of {ordersMeta.totalPages} · {ordersMeta.total} orders</span>
            <div className="flex gap-2">
              <button disabled={ordersPage <= 1} onClick={() => setOrdersPage(ordersPage - 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={ordersPage >= ordersMeta.totalPages} onClick={() => setOrdersPage(ordersPage + 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
