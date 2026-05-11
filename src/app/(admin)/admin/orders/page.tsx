"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import type { Order } from "@/types";

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
  const [data, setData]       = useState<PageData | null>(null);
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState<typeof STATUSES[number]>("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20", status });
    fetch(`/api/admin/orders?${qs}`, { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: PageData }>)
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, token]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id);
    await fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdating(null);
     
    void load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Orders</h1>

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
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
              <tr>
                {["Order", "Customer", "Items", "Total", "Date", "Status", "Update"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No orders found</td></tr>
              ) : data?.orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{order.delivery.fullName}</p>
                    <p className="text-xs text-gray-400">{order.delivery.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">£{order.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString("en-GB")}</td>
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
                      >
                        <option value="" disabled>{updating === order._id ? "…" : "Change"}</option>
                        {["pending","processing","shipped","delivered","cancelled"].map((s) => (
                          <option key={s} value={s} disabled={s === order.status}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                    </div>
                  </td>
                </tr>
              ))}
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
