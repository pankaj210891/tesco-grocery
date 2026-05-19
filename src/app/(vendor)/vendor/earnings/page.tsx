"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Clock, CheckCircle, Banknote, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import { formatPrice } from "@/lib/utils/format";
import type { VendorEarning, VendorEarningsSummary, EarningStatus } from "@/types";

interface EarningsData {
  earnings:   VendorEarning[];
  total:      number;
  totalPages: number;
  page:       number;
  summary:    VendorEarningsSummary;
}

const STATUS_STYLES: Record<EarningStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  released:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "",          label: "All" },
  { value: "pending",   label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "released",  label: "Released" },
];

export default function VendorEarningsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [data, setData]       = useState<EarningsData | null>(null);
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs  = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) qs.set("status", status);
      const res = await authClient(token).get<ApiResponse<EarningsData>>(
        `/api/vendor/earnings?${qs.toString()}`
      );
      if (res.data.data) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [token, page, status]);

  useEffect(() => {
    if (!user)                                              { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin")   { router.push("/");      return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  function handleStatusChange(s: string) {
    setStatus(s);
    setPage(1);
  }

  const summary = data?.summary;

  const summaryCards = [
    {
      label: "Total Earned",
      value: formatPrice(summary?.totalEarned ?? 0),
      icon:  TrendingUp,
      color: "text-[#1a7a4a]",
      bg:    "bg-[#1a7a4a]/10",
      testid: "summary-total-earned",
    },
    {
      label: "Pending",
      value: formatPrice(summary?.totalPending ?? 0),
      icon:  Clock,
      color: "text-yellow-600",
      bg:    "bg-yellow-50 dark:bg-yellow-900/20",
      testid: "summary-pending",
    },
    {
      label: "Confirmed",
      value: formatPrice(summary?.totalConfirmed ?? 0),
      icon:  CheckCircle,
      color: "text-blue-600",
      bg:    "bg-blue-50 dark:bg-blue-900/20",
      testid: "summary-confirmed",
    },
    {
      label: "Released",
      value: formatPrice(summary?.totalReleased ?? 0),
      icon:  Banknote,
      color: "text-green-600",
      bg:    "bg-green-50 dark:bg-green-900/20",
      testid: "summary-released",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Earnings Ledger</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="earnings-summary">
        {summaryCards.map(({ label, value, icon: Icon, color, bg, testid }) => (
          <div
            key={label}
            data-testid={testid}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
              <p className="text-lg font-black text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => handleStatusChange(t.value)}
            data-testid={`status-tab-${t.value || "all"}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              status === t.value
                ? "bg-[#1a7a4a] text-white border-[#1a7a4a]"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#1a7a4a] hover:text-[#1a7a4a]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 border-4 border-[#1a7a4a]/30 border-t-[#1a7a4a] rounded-full animate-spin" />
          </div>
        ) : !data?.earnings.length ? (
          <div className="text-center py-16 text-gray-400" data-testid="earnings-empty">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No earnings yet</p>
            <p className="text-sm mt-1">Earnings appear once customers place orders for your products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="earnings-table">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {["Order", "Date", "Gross", "Commission", "Net", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.earnings.map((e) => (
                  <tr key={e._id} data-testid={`earning-row-${e._id}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {e.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(e.orderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                      {formatPrice(e.grossAmount)}
                    </td>
                    <td className="px-4 py-3 text-red-500 dark:text-red-400">
                      −{formatPrice(e.commissionTotal)}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">
                      {formatPrice(e.netAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLES[e.status]}`}>
                        {e.status}
                      </span>
                      {e.status === "released" && e.payoutRef && (
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{e.payoutRef}</p>
                      )}
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
            {data.total} earning{data.total !== 1 ? "s" : ""} · page {data.page} of {data.totalPages}
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
