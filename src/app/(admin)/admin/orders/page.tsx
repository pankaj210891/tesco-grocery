"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, X, Search, Store, User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { formatPrice } from "@/lib/utils/format";
import type { Order, Vendor } from "@/types";

interface PageData { orders: Order[]; total: number; page: number; totalPages: number; }

const STATUSES = ["all", "pending", "processing", "shipped", "delivered", "cancelled"] as const;
const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const DATE_PRESETS = [
  { label: "Today",        getValue: () => { const d = today(); return { from: d, to: d }; } },
  { label: "Yesterday",    getValue: () => { const d = daysAgo(1); return { from: d, to: d }; } },
  { label: "Last 7 days",  getValue: () => ({ from: daysAgo(6), to: today() }) },
  { label: "Last 30 days", getValue: () => ({ from: daysAgo(29), to: today() }) },
  { label: "This month",   getValue: () => ({ from: firstOfMonth(), to: today() }) },
] as const;

function today()      { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

export default function AdminOrdersPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [data, setData]             = useState<PageData | null>(null);
  const [page, setPage]             = useState(1);
  const [status, setStatus]         = useState<typeof STATUSES[number]>("all");
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState<string | null>(null);
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [tempFrom, setTempFrom]     = useState("");
  const [tempTo, setTempTo]         = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [search, setSearch]         = useState("");
  // Marketplace filters
  const [vendorId, setVendorId]     = useState("");
  const [userId, setUserId]         = useState("");
  const [vendors, setVendors]       = useState<Pick<Vendor, "_id" | "name">[]>([]);

  const dateFilterRef = useRef<HTMLDivElement>(null);
  const authHeader    = { Authorization: `Bearer ${token}` };

  // Load vendor list for filter dropdown
  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/vendors?limit=50", { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: { vendors: Pick<Vendor, "_id" | "name">[] } }>)
      .then((j) => { if (j.success) setVendors(j.data.vendors); })
      .catch(() => { /* non-critical */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target as Node)) {
        setShowDateFilter(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20", status });
    if (search)   qs.set("q",        search);
    if (dateFrom) qs.set("dateFrom", dateFrom);
    if (dateTo)   qs.set("dateTo",   dateTo);
    if (vendorId) qs.set("vendorId", vendorId);
    if (userId)   qs.set("userId",   userId);
    fetch(`/api/admin/orders?${qs}`, { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: PageData }>)
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, token, dateFrom, dateTo, search, vendorId, userId]);

  useEffect(() => {
    if (!user)                { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/");     return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method:  "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });
    setUpdating(null);
    if (res.ok) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o._id === id ? { ...o, status: newStatus as Order["status"] } : o
          ),
        };
      });
    }
  }

  function applyPreset(from: string, to: string) {
    setDateFrom(from); setDateTo(to); setPage(1); setShowDateFilter(false);
  }

  function applyCustomDates() {
    setDateFrom(tempFrom); setDateTo(tempTo); setPage(1); setShowDateFilter(false);
  }

  function clearDates() {
    setDateFrom(""); setDateTo(""); setTempFrom(""); setTempTo(""); setPage(1);
  }

  function clearMarketplaceFilters() {
    setVendorId(""); setUserId(""); setPage(1);
  }

  const hasDateFilter        = !!dateFrom || !!dateTo;
  const hasMarketplaceFilter = !!vendorId || !!userId;

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

        {/* User ID filter */}
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4 text-gray-400" />
          <input
            value={userId}
            onChange={(e) => { setUserId(e.target.value.trim()); setPage(1); }}
            placeholder="User ID…"
            className="w-36 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
            data-testid="order-user-filter"
          />
        </div>

        {/* Date filter */}
        <div className="relative" ref={dateFilterRef}>
          <button
            onClick={() => showDateFilter ? setShowDateFilter(false) : (() => { setTempFrom(dateFrom); setTempTo(dateTo); setShowDateFilter(true); })()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              hasDateFilter
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {hasDateFilter ? `${dateFrom || "—"} → ${dateTo || "—"}` : "Date filter"}
          </button>

          {showDateFilter && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 min-w-[280px]">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick select</p>
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {DATE_PRESETS.map((p) => {
                  const { from, to } = p.getValue();
                  return (
                    <button key={p.label} onClick={() => applyPreset(from, to)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-gray-400 mb-0.5 block">From</label>
                  <input type="date" value={tempFrom} onChange={(e) => setTempFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-0.5 block">To</label>
                  <input type="date" value={tempTo} min={tempFrom} onChange={(e) => setTempTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={applyCustomDates} className="flex-1 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Apply</button>
                {hasDateFilter && (
                  <button onClick={() => { clearDates(); setShowDateFilter(false); }}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clear marketplace filters */}
        {hasMarketplaceFilter && (
          <button onClick={clearMarketplaceFilters}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 hover:bg-red-100 transition-colors"
            data-testid="clear-marketplace-filters"
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
                {["Order", "Customer", "Vendor(s)", "Items", "Total", "Payment", "Date", "Status", "Update"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.orders.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No orders found</td></tr>
              ) : data?.orders.map((order) => {
                // Collect unique vendor names from order items
                const orderVendors = [...new Set(
                  order.items
                    .filter((i) => i.vendorName)
                    .map((i) => i.vendorName as string),
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
                      <div className="relative inline-block">
                        <select
                          disabled={updating === order._id}
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) updateStatus(order._id, e.target.value); }}
                          className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none disabled:opacity-50 cursor-pointer"
                          data-testid={`order-status-update-${order._id}`}
                        >
                          <option value="" disabled>{updating === order._id ? "…" : "Change"}</option>
                          {["pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
                            <option key={s} value={s} disabled={s === order.status}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                      </div>
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
    </div>
  );
}
