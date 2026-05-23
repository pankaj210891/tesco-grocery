"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Banknote, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils/format";
import type { VendorEarning, EarningStatus } from "@/types";

interface EarningsPage {
  earnings:   VendorEarning[];
  total:      number;
  totalPages: number;
  page:       number;
}

const STATUS_STYLES: Record<EarningStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  released:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_TABS = [
  { value: "",          label: "All"       },
  { value: "pending",   label: "Pending"   },
  { value: "confirmed", label: "Confirmed" },
  { value: "released",  label: "Released"  },
];

export default function AdminEarningsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [data, setData]           = useState<EarningsPage | null>(null);
  const [page, setPage]           = useState(1);
  const [status, setStatus]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [payoutRef, setPayoutRef] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) qs.set("status", status);
      const res = await authClient(token).get<ApiResponse<EarningsPage>>(
        `/api/admin/earnings?${qs.toString()}`
      );
      if (res.data.data) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [token, page, status]);

  useEffect(() => {
    if (!user)                 { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/");      return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  function handleStatusChange(s: string) {
    setStatus(s);
    setPage(1);
  }

  async function handleRelease(earningId: string) {
    setReleasing(earningId);
    try {
      await authClient(token!).patch(`/api/admin/earnings/${earningId}/release`, {
        payoutRef: payoutRef[earningId] ?? "",
      });
      void load();
    } catch {
      toast.error("Failed to release earning. Please try again.");
    } finally {
      setReleasing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0F4C75]/10 rounded-xl flex items-center justify-center">
          <Banknote className="h-5 w-5 text-[#0F4C75]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Earnings Ledger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review and release vendor payouts.
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => handleStatusChange(t.value)}
            data-testid={`admin-status-tab-${t.value || "all"}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              status === t.value
                ? "bg-[#0F4C75] text-white border-[#0F4C75]"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#0F4C75] hover:text-[#0F4C75]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 280px)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 border-4 border-[#0F4C75]/30 border-t-[#0F4C75] rounded-full animate-spin" />
          </div>
        ) : !data?.earnings.length ? (
          <div className="text-center py-16 text-gray-400" data-testid="admin-earnings-empty">
            <Banknote className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No earnings found</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm" data-testid="admin-earnings-table">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                <tr>
                  {["Order", "Date", "Vendor", "Gross", "Commission", "Net", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.earnings.map((e) => (
                  <tr key={e._id} data-testid={`admin-earning-row-${e._id}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {e.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(e.orderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {e.vendorName ?? <span className="font-mono text-gray-400">{e.vendorId.slice(-6)}</span>}
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
                    </td>
                    <td className="px-4 py-3">
                      {e.status === "confirmed" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={payoutRef[e._id] ?? ""}
                            data-testid={`payout-ref-${e._id}`}
                            placeholder="Ref# (opt.)"
                            onChange={(ev) => setPayoutRef((p) => ({ ...p, [e._id]: ev.target.value }))}
                            className="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0F4C75]"
                          />
                          <button
                            onClick={() => void handleRelease(e._id)}
                            disabled={releasing === e._id}
                            data-testid={`release-btn-${e._id}`}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-[#0F4C75] text-white rounded-lg hover:bg-[#0a3a5c] disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {releasing === e._id ? "…" : "Release"}
                          </button>
                        </div>
                      ) : e.status === "released" ? (
                        <span className="text-[11px] text-gray-400 font-mono">{e.payoutRef || "—"}</span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Awaiting delivery</span>
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
            {data.total} record{data.total !== 1 ? "s" : ""} · page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
