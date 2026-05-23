"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, Search, Store, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import { formatPrice } from "@/lib/utils/format";

const AdminOrderDetail = dynamic(
  () => import("@/components/admin/AdminOrderDetail").then((m) => ({ default: m.AdminOrderDetail })),
  { loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white dark:bg-gray-900 rounded-xl p-8 animate-pulse w-full max-w-2xl mx-4 h-64" /></div> }
);
import type { Order, OrderDetail, Vendor } from "@/types";

interface PageData { orders: Order[]; total: number; page: number; totalPages: number; }

const STATUSES = ["all", "pending", "processing", "shipped", "delivered", "cancelled"] as const;
const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function AdminOrdersPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [data, setData]         = useState<PageData | null>(null);
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState<typeof STATUSES[number]>("all");
  const [loading, setLoading]   = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [search,   setSearch]   = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendors,  setVendors]  = useState<Pick<Vendor, "_id" | "name">[]>([]);

  useEffect(() => {
    if (!token) return;
    authClient(token).get<{ success: boolean; data: { vendors: Pick<Vendor, "_id" | "name">[] } }>("/api/admin/vendors?limit=100")
      .then((res) => { if (res.data.success) setVendors(res.data.data.vendors); })
      .catch(() => { /* non-critical */ });
   
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20", status });
    if (search)   qs.set("q",        search);
    if (dateFrom) qs.set("dateFrom", dateFrom);
    if (dateTo)   qs.set("dateTo",   dateTo);
    if (vendorId) qs.set("vendorId", vendorId);
    authClient(token!).get<{ success: boolean; data: PageData }>(`/api/admin/orders?${qs}`)
      .then((res) => { if (res.data.success) setData(res.data.data); })
      .finally(() => setLoading(false));
   
  }, [page, status, token, dateFrom, dateTo, search, vendorId]);

  useEffect(() => {
    if (!user)                 { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/");      return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  const hasVendorFilter = !!vendorId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Orders</h1>
        {data && <span className="text-sm text-gray-500 dark:text-gray-400">{data.total} total</span>}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search order, customer…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
          data-testid="order-search"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                status === s
                  ? "bg-[#0F4C75] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              data-testid={`order-status-${s}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Vendor filter */}
        <div className="flex items-center gap-1.5">
          <Store className="h-4 w-4 text-gray-400" />
          <select
            value={vendorId}
            onChange={(e) => { setVendorId(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
            data-testid="order-vendor-filter"
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Reusable date filter */}
        <AdminDateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onApply={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
          onClear={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
        />

        {/* Clear vendor filter */}
        {hasVendorFilter && (
          <button
            onClick={() => { setVendorId(""); setPage(1); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 hover:bg-red-100 transition-colors"
            data-testid="clear-vendor-filter"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 340px)" }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                {["Order", "Customer", "Vendor(s)", "Items", "Total", "Payment", "Date", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.orders.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No orders found</td></tr>
              ) : data?.orders.map((order) => {
                const orderVendors = [...new Set(
                  order.items.filter((i) => i.vendorName).map((i) => i.vendorName as string),
                )];
                return (
                  <tr key={order._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30" data-testid="order-row">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">#{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{order.delivery.fullName}</p>
                      <p className="text-xs text-gray-400">{order.delivery.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {orderVendors.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {orderVendors.map((v) => (
                            <span key={v} className="text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{v}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">Platform</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        order.paymentMethod === "razorpay"
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      }`}>
                        {order.paymentMethod === "razorpay" ? "Razorpay" : "COD"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] ?? ""}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedOrderId(order._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#0F4C75] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        title="View order details"
                        data-testid={`view-order-${order._id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {data.page} of {data.totalPages} · {data.total} orders</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrderId && (
        <AdminOrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onUpdate={(updated: OrderDetail) => {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                orders: prev.orders.map((o) =>
                  o._id === updated._id ? { ...o, paymentStatus: updated.paymentStatus, refundedAmount: updated.refundedAmount, refundStatus: updated.refundStatus } : o,
                ),
              };
            });
          }}
        />
      )}
    </div>
  );
}
