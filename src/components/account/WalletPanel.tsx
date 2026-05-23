"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, ShoppingBag,
  RefreshCw, Loader2, Gift, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import { formatPrice } from "@/lib/utils/format";
import NumberInput from "@/components/ui/NumberInput";
import type { Wallet as WalletType, WalletTransaction } from "@/types";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) { resolve(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Quick topup amounts ──────────────────────────────────────────────────────
const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

// ─── Transaction row ──────────────────────────────────────────────────────────
function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const isCredit = tx.type === "credit";

  const REASON_LABELS: Record<string, string> = {
    topup:        "Wallet Top-up",
    order_payment:"Order Payment",
    refund:       "Order Refund",
    admin_credit: "Admin Credit",
    admin_debit:  "Admin Debit",
  };

  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 dark:border-gray-700/40 last:border-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        isCredit ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
      }`}>
        <Icon className={`h-4 w-4 ${isCredit ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {REASON_LABELS[tx.reason] ?? tx.reason}
        </p>
        {tx.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tx.description}</p>
        )}
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          {new Date(tx.createdAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
          {tx.orderNumber && (
            <span className="ml-2 text-[#FCA311] font-mono">{tx.orderNumber}</span>
          )}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${isCredit ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
          {isCredit ? "+" : "–"}{formatPrice(tx.amount)}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Bal: {formatPrice(tx.balanceAfter)}
        </p>
      </div>
    </div>
  );
}

// ─── Topup modal ──────────────────────────────────────────────────────────────
function TopupModal({
  onClose,
  onSuccess,
}: {
  onClose:   () => void;
  onSuccess: (newBalance: number) => void;
}) {
  const { token, user } = useAuthStore();
  const [amount,  setAmount]  = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  async function handleTopup() {
    const num = Number(amount);
    if (!num || num < 10)  { toast.error("Minimum top-up is ₹10");    return; }
    if (num > 50000)        { toast.error("Maximum top-up is ₹50,000"); return; }
    if (!token || !user?._id) return;

    setLoading(true);
    try {
      // ── Step 1: load Razorpay SDK ──────────────────────────────────────────
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load payment gateway. Check your internet connection.");
        setLoading(false);
        return;
      }

      // ── Step 2: create Razorpay order on server ────────────────────────────
      const orderRes = await authClient(token).post<{
        success: boolean;
        data: { razorpayOrderId: string; amount: number; currency: string; keyId: string };
      }>("/api/payments/razorpay/wallet-topup/create-order", {
        amount: num,
        userId: user._id,
      });

      if (!orderRes.data.success) {
        toast.error("Failed to initiate payment. Please try again.");
        setLoading(false);
        return;
      }

      const { razorpayOrderId, amount: paise, currency, keyId } = orderRes.data.data;

      // ── Step 3: open Razorpay checkout modal ───────────────────────────────
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         keyId,
          amount:      paise,
          currency,
          order_id:    razorpayOrderId,
          name:        "Prakash Supermarket",
          description: "Wallet Top-up",
          theme:       { color: "#FCA311" },
          prefill: {
            name:  user.name  ?? "",
            email: user.email ?? "",
          },
          handler: async (response: {
            razorpay_order_id:   string;
            razorpay_payment_id: string;
            razorpay_signature:  string;
          }) => {
            try {
              // ── Step 4: verify payment & credit wallet ─────────────────────
              const verifyRes = await authClient(token).post<{
                success: boolean;
                data: { wallet: { balance: number } };
              }>("/api/payments/razorpay/wallet-topup/verify", {
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amount: num,
                userId: user._id,
              });

              if (verifyRes.data.success) {
                toast.success(`₹${num} added to your wallet!`);
                onSuccess(verifyRes.data.data.wallet.balance);
                onClose();
                resolve();
              } else {
                toast.error("Payment received but wallet credit failed. Contact support.");
                reject(new Error("verify_failed"));
              }
            } catch {
              toast.error("Payment verification failed. Contact support if amount was deducted.");
              reject(new Error("verify_error"));
            }
          },
          modal: {
            ondismiss: () => {
              toast.info("Payment cancelled.");
              resolve();
            },
          },
        });
        rzp.open();
      });
    } catch (err) {
      if (err instanceof Error && !["verify_failed", "verify_error"].includes(err.message)) {
        toast.error("Top-up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FCA311]/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-[#FCA311]" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 dark:text-white">Add Money</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pay via Razorpay to top up your Prakash Wallet</p>
          </div>
        </div>

        {/* Quick amounts */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Quick add</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(q)}
                className={`py-2 text-sm font-bold rounded-xl border-2 transition-colors ${
                  amount === q
                    ? "border-[#FCA311] bg-amber-50 dark:bg-amber-900/20 text-[#FCA311]"
                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#FCA311]/40"
                }`}
              >
                {formatPrice(q)}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Custom amount
          </p>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm pointer-events-none z-10">₹</span>
            <NumberInput
              min={10}
              max={50000}
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Enter amount"
              className="w-full pl-8 pr-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15"
            />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Min ₹10 · Max ₹50,000 per transaction</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleTopup()}
            disabled={loading || !amount || Number(amount) < 10}
            className="flex-1 py-2.5 bg-[#FCA311] text-white text-sm font-bold rounded-xl hover:bg-[#E8920A] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Processing…" : `Pay ${amount ? formatPrice(Number(amount)) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main WalletPanel ─────────────────────────────────────────────────────────
export default function WalletPanel() {
  const { token } = useAuthStore();

  const [wallet,       setWallet]       = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [txLoading,    setTxLoading]    = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState("");
  const [showTopup,    setShowTopup]    = useState(false);

  const PAGE_LIMIT = 10;

  const fetchWallet = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authClient(token).get<{ data: WalletType }>("/api/account/wallet");
      setWallet(res.data.data);
    } catch {
      setError("Failed to load wallet.");
    }
  }, [token]);

  const fetchTransactions = useCallback(async (p: number) => {
    if (!token) return;
    setTxLoading(true);
    try {
      const res = await authClient(token).get<{
        data: {
          transactions: WalletTransaction[];
          total:        number;
          page:         number;
          totalPages:   number;
        };
      }>(`/api/account/wallet/transactions?page=${p}&limit=${PAGE_LIMIT}`);
      setTransactions(res.data.data.transactions);
      setTotal(res.data.data.total);
      setTotalPages(res.data.data.totalPages);
    } catch {
      toast.error("Failed to load transactions.");
    } finally {
      setTxLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    async function init() {
      await fetchWallet();
      await fetchTransactions(1);
      setLoading(false);
    }
    void init();
  }, [token, fetchWallet, fetchTransactions]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchWallet();
      toast.success("Balance refreshed.");
    } catch {
      toast.error("Failed to refresh balance.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handlePageChange(p: number) {
    setPage(p);
    await fetchTransactions(p);
  }

  function handleTopupSuccess(newBalance: number) {
    setWallet((w) => w ? { ...w, balance: newBalance } : w);
    void fetchTransactions(1);
    setPage(1);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
        <div className="h-48 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button onClick={() => { setError(""); void fetchWallet(); }} className="ml-auto text-xs font-bold text-red-600 hover:underline shrink-0">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Balance card ── */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F4C75 0%, #1a6fa5 60%, #FCA311 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-4 w-36 h-36 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-white/80" />
              <span className="text-sm font-semibold text-white/80">Prakash Wallet</span>
            </div>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              aria-label="Refresh balance"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <p className="text-4xl font-black tracking-tight mb-1">
            {formatPrice(wallet?.balance ?? 0)}
          </p>
          <p className="text-xs text-white/60">Available balance</p>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setShowTopup(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#0F4C75] text-sm font-bold rounded-xl hover:bg-white/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Money
            </button>
            <button
              onClick={() => { /* navigate to checkout */ window.location.href = "/products"; }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/15 text-white text-sm font-bold rounded-xl hover:bg-white/25 transition-colors border border-white/20"
            >
              <ShoppingBag className="h-4 w-4" /> Shop Now
            </button>
          </div>
        </div>
      </div>

      {/* ── How to use ── */}
      {wallet && wallet.balance === 0 && transactions.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex items-start gap-3">
          <Gift className="h-5 w-5 text-[#FCA311] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Welcome to your Wallet!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Add money to your wallet and use it at checkout for instant, secure payments.
              You can top up any time and use the balance across all your orders.
            </p>
          </div>
        </div>
      )}

      {/* ── Transaction history ── */}
      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            Transaction History
            {total > 0 && (
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({total})</span>
            )}
          </h3>
        </div>

        <div className="px-5 py-3 min-h-[200px]">
          {txLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((n) => <div key={n} className="h-14 animate-pulse bg-gray-100 dark:bg-gray-700/40 rounded-xl" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <Wallet className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">No transactions yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Add money to get started</p>
            </div>
          ) : (
            <div>
              {transactions.map((tx) => <TransactionRow key={tx._id} tx={tx} />)}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700/60">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => void handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showTopup && (
        <TopupModal
          onClose={() => setShowTopup(false)}
          onSuccess={handleTopupSuccess}
        />
      )}
    </div>
  );
}
