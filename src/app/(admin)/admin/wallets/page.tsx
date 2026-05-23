"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet, Search, ChevronLeft, ChevronRight,
  Plus, Minus, Loader2, X, AlertCircle, History,
  ArrowUpRight, ArrowDownLeft, ShieldCheck,
} from "lucide-react";
import NumberInput from "@/components/ui/NumberInput";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import { formatPrice } from "@/lib/utils/format";
import { useDebounce } from "@/hooks/useDebounce";
import type { AdminWalletRow, AdminWalletTransaction } from "@/types";

interface WalletPage {
  wallets:    AdminWalletRow[];
  total:      number;
  page:       number;
  totalPages: number;
}

interface TxPage {
  transactions: AdminWalletTransaction[];
  total:        number;
  page:         number;
  totalPages:   number;
}

const REASON_LABELS: Record<string, string> = {
  topup:         "Wallet Top-up",
  order_payment: "Order Payment",
  refund:        "Order Refund",
  admin_credit:  "Admin Credit",
  admin_debit:   "Admin Debit",
};

const REASON_COLORS: Record<string, string> = {
  topup:         "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  order_payment: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
  refund:        "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  admin_credit:  "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  admin_debit:   "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

// ─── Transactions drawer ──────────────────────────────────────────────────────
function TransactionsDrawer({
  row,
  onClose,
}: {
  row:     AdminWalletRow;
  onClose: () => void;
}) {
  const { token } = useAuthStore();
  const [data,    setData]    = useState<TxPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);

  const PAGE_LIMIT = 15;

  const load = useCallback(async (p: number) => {
    if (!token) return;
    try {
      const qs  = new URLSearchParams({ page: String(p), limit: String(PAGE_LIMIT) });
      const res = await authClient(token).get<ApiResponse<TxPage>>(
        `/api/admin/wallets/${row.userId}/transactions?${qs.toString()}`
      );
      if (res.data.data) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [token, row.userId]);

  useEffect(() => { void load(1); }, [load]);

  async function handlePageChange(p: number) {
    setPage(p);
    setLoading(true);
    await load(p);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F4C75]/10 flex items-center justify-center shrink-0">
              <History className="h-4 w-4 text-[#0F4C75]" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">
                {row.userName}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                {row.userEmail}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Balance</p>
              <p className={`text-sm font-black ${row.balance > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                {formatPrice(row.balance)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Sub-header: count */}
        {data && (
          <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {data.total} transaction{data.total !== 1 ? "s" : ""} · page {page} of {data.totalPages || 1}
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-[#0F4C75]" />
            </div>
          ) : !data?.transactions.length ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <Wallet className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {data.transactions.map((tx) => {
                const isCredit = tx.type === "credit";
                const Icon     = isCredit ? ArrowDownLeft : ArrowUpRight;
                return (
                  <div key={tx._id} className="px-5 py-4 hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-start gap-3">

                      {/* Type icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCredit
                          ? "bg-green-50 dark:bg-green-900/20"
                          : "bg-red-50 dark:bg-red-900/20"
                      }`}>
                        <Icon className={`h-4 w-4 ${isCredit ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`} />
                      </div>

                      {/* Middle */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${REASON_COLORS[tx.reason] ?? "bg-gray-100 text-gray-600"}`}>
                            {REASON_LABELS[tx.reason] ?? tx.reason}
                          </span>
                          {tx.status === "failed" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              Failed
                            </span>
                          )}
                        </div>

                        {tx.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {tx.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {new Date(tx.createdAt).toLocaleString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                          {tx.orderNumber && (
                            <span className="text-[11px] font-mono text-[#FCA311]">
                              #{tx.orderNumber}
                            </span>
                          )}
                          {tx.performedByName && (
                            <span className="flex items-center gap-1 text-[11px] text-[#0F4C75] dark:text-blue-400">
                              <ShieldCheck className="h-3 w-3" />
                              {tx.performedByName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount + balance after */}
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${isCredit ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                          {isCredit ? "+" : "–"}{formatPrice(tx.amount)}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          Bal: {formatPrice(tx.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700/60 shrink-0">
            <button
              onClick={() => void handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => void handlePageChange(page + 1)}
              disabled={page >= data.totalPages || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Credit / Debit modal ─────────────────────────────────────────────────────
function CreditDebitModal({
  row,
  mode,
  onClose,
  onSuccess,
}: {
  row:       AdminWalletRow;
  mode:      "credit" | "debit";
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const { token }                  = useAuthStore();
  const [amount, setAmount]        = useState<number | "">("");
  const [description, setDesc]     = useState("");
  const [loading, setLoading]      = useState(false);
  const [error, setError]          = useState("");

  const isCredit = mode === "credit";

  async function handleSubmit() {
    const num = Number(amount);
    if (!num || num < 1) { setError("Minimum amount is ₹1"); return; }
    if (!description.trim()) { setError("Description is required"); return; }
    if (!token) return;

    if (!isCredit && num > row.balance) {
      setError(`Cannot debit more than available balance (${formatPrice(row.balance)})`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await authClient(token).post(
        `/api/admin/wallets/${row.userId}/${mode}`,
        { amount: num, description: description.trim() }
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isCredit ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
            }`}>
              {isCredit
                ? <Plus  className="h-5 w-5 text-green-600 dark:text-green-400" />
                : <Minus className="h-5 w-5 text-red-500 dark:text-red-400" />
              }
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white text-sm">
                {isCredit ? "Credit Wallet" : "Debit Wallet"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{row.userName} · {row.userEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Current balance */}
        <div className={`rounded-xl px-4 py-3 ${
          isCredit
            ? "bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/40"
            : "bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/40"
        }`}>
          <p className="text-xs text-gray-500 dark:text-gray-400">Current balance</p>
          <p className={`text-lg font-black ${
            isCredit ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}>{formatPrice(row.balance)}</p>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Amount (₹) <span className="text-red-500">*</span>
          </label>
          <NumberInput
            min={1}
            max={isCredit ? 100000 : row.balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Enter amount"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Reason / Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={isCredit ? "e.g. Goodwill credit, refund" : "e.g. Correction, over-credit reversal"}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loading || !amount || !description.trim()}
            className={`flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${
              isCredit
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCredit ? "Credit" : "Debit"} {amount ? formatPrice(Number(amount)) : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminWalletsPage() {
  const { user, token } = useAuthStore();
  const router          = useRouter();

  const [data,    setData]    = useState<WalletPage | null>(null);
  const [loading, setLoading] = useState(true); // true = show skeleton on first mount
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState<{ row: AdminWalletRow; mode: "credit" | "debit" } | null>(null);
  const [drawer,  setDrawer]  = useState<AdminWalletRow | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) qs.set("search", debouncedSearch);
      const res = await authClient(token).get<ApiResponse<WalletPage>>(
        `/api/admin/wallets?${qs.toString()}`
      );
      if (res.data.data) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  useEffect(() => {
    if (!user)                 { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/");      return; }
    void load();
  }, [user, router, load]);

  const totalBalance = data?.wallets.reduce((s, w) => s + w.balance, 0) ?? 0;
  const activeCount  = data?.wallets.filter((w) => w.balance > 0).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0F4C75]/10 rounded-xl flex items-center justify-center">
          <Wallet className="h-5 w-5 text-[#0F4C75]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Wallet Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage customer wallet balances.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Customers",
            value: String(data?.total ?? 0),
            color: "text-[#0F4C75]",
            bg:    "bg-[#0F4C75]/10",
          },
          {
            label: "Active Wallets (non-zero)",
            value: String(activeCount),
            color: "text-green-600",
            bg:    "bg-green-50 dark:bg-green-900/20",
          },
          {
            label: "Total Funds (page)",
            value: formatPrice(totalBalance),
            color: "text-[#FCA311]",
            bg:    "bg-amber-50 dark:bg-amber-900/20",
          },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
              <Wallet className={`h-5 w-5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest truncate">{label}</p>
              <p className="text-lg font-black text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by customer name or email…"
            className="pl-9 pr-3 py-2 text-sm w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-56">
            <div className="h-8 w-8 border-4 border-[#0F4C75]/30 border-t-[#0F4C75] rounded-full animate-spin" />
          </div>
        ) : !data?.wallets.length ? (
          <div className="text-center py-16 text-gray-400">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No customers found</p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-2 text-sm text-[#0F4C75] hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {["Customer", "Email", "Balance", "Last Top-up", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.wallets.map((row) => (
                  <tr
                    key={row.userId}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                      {row.userName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {row.userEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-black text-sm ${
                        row.balance > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}>
                        {formatPrice(row.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                      {row.lastTopupAt
                        ? new Date(row.lastTopupAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDrawer(row)}
                          title="View transaction history"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0F4C75] dark:text-blue-400 bg-[#0F4C75]/8 dark:bg-blue-900/20 border border-[#0F4C75]/20 dark:border-blue-800/40 rounded-lg hover:bg-[#0F4C75]/15 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <History className="h-3 w-3" /> History
                        </button>
                        <button
                          onClick={() => setModal({ row, mode: "credit" })}
                          title="Credit wallet"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Credit
                        </button>
                        <button
                          onClick={() => setModal({ row, mode: "debit" })}
                          disabled={row.balance <= 0}
                          title="Debit wallet"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-3 w-3" /> Debit
                        </button>
                      </div>
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.total} customer{data.total !== 1 ? "s" : ""} · page {data.page} of {data.totalPages}
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

      {/* Transactions drawer */}
      {drawer && (
        <TransactionsDrawer
          row={drawer}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* Credit / Debit Modal */}
      {modal && (
        <CreditDebitModal
          row={modal.row}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSuccess={() => void load()}
        />
      )}
    </div>
  );
}
