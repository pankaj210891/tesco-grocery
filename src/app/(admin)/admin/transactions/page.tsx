"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt, TrendingUp, Banknote, Store, ShoppingBag,
  ChevronLeft, ChevronRight, Search, X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import { formatPrice } from "@/lib/utils/format";
import { useDebounce } from "@/hooks/useDebounce";

interface Transaction {
  _id:             string;
  orderNumber:     string;
  date:            string;
  customerName:    string;
  itemCount:       number;
  subtotal:        number;
  total:           number;
  status:          string;
  paymentStatus:   string;
  platformRevenue: number;
  vendorPayout:    number;
}

interface Summary {
  grossVolume:     number;
  platformRevenue: number;
  vendorPayout:    number;
  orderCount:      number;
}

interface TxPage {
  transactions: Transaction[];
  total:        number;
  totalPages:   number;
  page:         number;
  summary:      Summary;
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled:  "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

const PAYMENT_COLORS: Record<string, string> = {
  paid:                 "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  pending:              "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  failed:               "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
  refunded:             "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  partially_refunded:   "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
};

const inputCls =
  "px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]";

export default function AdminTransactionsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [data, setData]           = useState<TxPage | null>(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("");
  const [payStatus, setPayStatus] = useState("");
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");

  const debouncedSearch = useDebounce(search, 350);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) qs.set("q",             debouncedSearch);
      if (status)          qs.set("status",         status);
      if (payStatus)       qs.set("paymentStatus",  payStatus);
      if (from)            qs.set("from",            from);
      if (to)              qs.set("to",              to);

      const res = await authClient(token).get<ApiResponse<TxPage>>(
        `/api/admin/transactions?${qs.toString()}`
      );
      if (res.data.data) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, status, payStatus, from, to]);

  useEffect(() => {
    if (!user)                 { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/");      return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPayStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const hasFilters = search || status || payStatus || from || to;
  const s = data?.summary;

  const summaryCards = [
    {
      label:  "Gross Volume",
      value:  formatPrice(s?.grossVolume ?? 0),
      icon:   ShoppingBag,
      color:  "text-[#0F4C75]",
      bg:     "bg-[#0F4C75]/10",
      testid: "tx-gross-volume",
    },
    {
      label:  "Platform Revenue",
      value:  formatPrice(s?.platformRevenue ?? 0),
      icon:   TrendingUp,
      color:  "text-green-600",
      bg:     "bg-green-50 dark:bg-green-900/20",
      testid: "tx-platform-revenue",
    },
    {
      label:  "Vendor Payouts",
      value:  formatPrice(s?.vendorPayout ?? 0),
      icon:   Store,
      color:  "text-purple-600",
      bg:     "bg-purple-50 dark:bg-purple-900/20",
      testid: "tx-vendor-payout",
    },
    {
      label:  "Orders",
      value:  String(s?.orderCount ?? 0),
      icon:   Receipt,
      color:  "text-amber-600",
      bg:     "bg-amber-50 dark:bg-amber-900/20",
      testid: "tx-order-count",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0F4C75]/10 rounded-xl flex items-center justify-center">
          <Receipt className="h-5 w-5 text-[#0F4C75]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Transaction Monitor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Platform-wide financial ledger with commission and payout breakdown.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="tx-summary">
        {summaryCards.map(({ label, value, icon: Icon, color, bg, testid }) => (
          <div
            key={label}
            data-testid={testid}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest truncate">{label}</p>
              <p className="text-lg font-black text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4"
        data-testid="tx-filters"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              data-testid="tx-search"
              placeholder="Order # or customer name…"
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`${inputCls} pl-9 w-full`}
            />
          </div>

          {/* Order status */}
          <select
            value={status}
            data-testid="tx-status-filter"
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className={inputCls}
          >
            <option value="">All statuses</option>
            {["pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>

          {/* Payment status */}
          <select
            value={payStatus}
            data-testid="tx-payment-filter"
            onChange={(e) => { setPayStatus(e.target.value); setPage(1); }}
            className={inputCls}
          >
            <option value="">All payments</option>
            {["paid", "pending", "failed", "refunded", "partially_refunded"].map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={resetFilters}
              data-testid="tx-clear-filters"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {/* Date range row */}
        <div className="flex gap-3 mt-3 items-center">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Period</label>
          <input
            type="date"
            value={from}
            data-testid="tx-date-from"
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className={`${inputCls} flex-1 max-w-[180px]`}
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={to}
            data-testid="tx-date-to"
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className={`${inputCls} flex-1 max-w-[180px]`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 340px)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-56">
            <div className="h-8 w-8 border-4 border-[#0F4C75]/30 border-t-[#0F4C75] rounded-full animate-spin" />
          </div>
        ) : !data?.transactions.length ? (
          <div className="text-center py-16 text-gray-400" data-testid="tx-empty">
            <Banknote className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No transactions found</p>
            {hasFilters && (
              <button onClick={resetFilters} className="mt-2 text-sm text-[#0F4C75] hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm" data-testid="tx-table">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                <tr>
                  {[
                    "Order", "Date", "Customer", "Items",
                    "Total", "Commission", "Vendor Net",
                    "Order Status", "Payment",
                  ].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.transactions.map((tx) => (
                  <tr
                    key={tx._id}
                    data-testid={`tx-row-${tx._id}`}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F4C75] dark:text-blue-400 whitespace-nowrap">
                      {tx.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                      {tx.customerName}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                      {tx.itemCount}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {formatPrice(tx.total)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      {tx.platformRevenue > 0 ? `+${formatPrice(tx.platformRevenue)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      {tx.vendorPayout > 0 ? formatPrice(tx.vendorPayout) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${ORDER_STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${PAYMENT_COLORS[tx.paymentStatus] ?? "bg-gray-100 text-gray-500"}`}>
                        {tx.paymentStatus?.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {data.total} transaction{data.total !== 1 ? "s" : ""} · page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
