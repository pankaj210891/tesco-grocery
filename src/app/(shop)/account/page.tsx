"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Package, ChevronRight, LogOut, ShoppingBag,
  MapPin, Filter, TrendingUp, CheckCircle, Clock, ReceiptText,
} from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { formatPrice } from "@/lib/utils/format";
import { useDateFilter } from "@/hooks/useDateFilter";
import DateFilter from "@/components/ui/DateFilter";
import type { Order } from "@/types";
import AddressSection from "@/components/account/AddressSection";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending:    "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/40",
  processing: "bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-400   border-blue-200   dark:border-blue-800/40",
  shipped:    "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
  delivered:  "bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400  border-green-200  dark:border-green-800/40",
  cancelled:  "bg-red-50    dark:bg-red-900/20    text-red-700    dark:text-red-400    border-red-200    dark:border-red-800/40",
};

function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

type Tab = "overview" | "addresses";

const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "overview",  label: "Overview",   Icon: User    },
  { id: "addresses", label: "Addresses",  Icon: MapPin  },
];

export default function AccountPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user, token, logout } = useAuthStore();

  const [activeTab,            setActiveTab]            = useState<Tab>("overview");
  const [allOrders,            setAllOrders]            = useState<Order[]>([]);
  const [serverFilteredOrders, setServerFilteredOrders] = useState<Order[]>([]);
  const [fetchedFilterKey,     setFetchedFilterKey]     = useState("");
  const [loading,              setLoading]              = useState(true);
  const [error,                setError]                = useState("");

  const dateFilter = useDateFilter("all");

  // Use YYYY-MM-DD strings so the backend builds clean 00:00:00–23:59:59 UTC day boundaries
  const fromParam = dateFilter.range.from ? dateFilter.range.from.toISOString().slice(0, 10) : "";
  const toParam   = dateFilter.range.to   ? dateFilter.range.to.toISOString().slice(0, 10)   : "";

  // When a filter is active and the fetch hasn't completed for the current params, show skeleton
  const currentFilterKey = `${fromParam}|${toParam}`;
  const filterLoading    = !!(fromParam || toParam) && fetchedFilterKey !== currentFilterKey;

  // Derive display list: server-filtered when a date range is active, otherwise all orders
  const displayOrders = fromParam || toParam ? serverFilteredOrders : allOrders;

  // Quick stats always from ALL orders (never affected by date filter)
  const stats = useMemo(() => {
    const delivered  = allOrders.filter((o) => o.status === "delivered").length;
    const pending    = allOrders.filter((o) => o.status === "pending" || o.status === "processing").length;
    const totalSpent = allOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
    return { delivered, pending, totalSpent };
  }, [allOrders]);

  // Initial load: fetch all orders (unfiltered) for stats
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace("/login?redirect=/account"); return; }
    if (!token) return;

    async function load() {
      try {
        const { data: json } = await axios.get("/api/account/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllOrders(json.data ?? []);
      } catch (err) {
        const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
        setError(msg ?? "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [hydrated, user, router, token]);

  // Re-fetch filtered order list from backend whenever date range changes
  useEffect(() => {
    if (loading || !token || (!fromParam && !toParam)) return;

    const params = new URLSearchParams();
    if (fromParam) params.set("from", fromParam);
    if (toParam)   params.set("to",   toParam);
    const key = currentFilterKey;

    async function fetchFiltered() {
      try {
        const { data: json } = await axios.get(
          `/api/account/orders?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setServerFilteredOrders(json.data ?? []);
      } catch {
        // leave previous results; key still updates so skeleton clears
      } finally {
        setFetchedFilterKey(key);
      }
    }
    void fetchFiltered();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromParam, toParam]);

  if (!hydrated || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-2xl w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map((n) => <div key={n} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  function handleLogout() { logout(); router.push("/"); }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome back, <span className="font-semibold text-gray-700 dark:text-gray-300">{user.name.split(" ")[0]}</span>
        </p>
      </div>

      {/* Tab bar */}
      <div className="inline-flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === id
                ? "bg-white dark:bg-gray-700 text-[#00539F] dark:text-blue-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">

          {/* Top row: profile + stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Profile card */}
            <div className="lg:col-span-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 h-full flex flex-col">
                {/* Avatar + name */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shrink-0"
                    style={{ background: "linear-gradient(135deg, #0F4C75, #00539F)" }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-gray-900 dark:text-white truncate text-base">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#00539F] dark:text-blue-400 uppercase tracking-wide">
                      {user.role}
                    </span>
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-2 text-sm border-t border-gray-100 dark:border-gray-700 pt-4 flex-1">
                  {[
                    { label: "Member since",  value: formatDate(user.createdAt) },
                    { label: "Total orders",  value: allOrders.length.toString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{label}</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:border-red-300 hover:text-red-600 hover:bg-red-50 dark:hover:border-red-700 dark:hover:text-red-400 dark:hover:bg-red-950/20 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>

            {/* Stats cards */}
            <div className="lg:col-span-8 grid grid-cols-3 gap-4">
              {[
                {
                  label: "Total Orders",
                  value: allOrders.length,
                  Icon:  Package,
                  color: "text-[#00539F] dark:text-blue-400",
                  bg:    "bg-blue-50 dark:bg-blue-900/20",
                },
                {
                  label: "Delivered",
                  value: loading ? "—" : stats.delivered,
                  Icon:  CheckCircle,
                  color: "text-green-600 dark:text-green-400",
                  bg:    "bg-green-50 dark:bg-green-900/20",
                },
                {
                  label: "In Progress",
                  value: loading ? "—" : stats.pending,
                  Icon:  Clock,
                  color: "text-amber-600 dark:text-amber-400",
                  bg:    "bg-amber-50 dark:bg-amber-900/20",
                },
              ].map(({ label, value, Icon, color, bg }) => (
                <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-3">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}

              {/* Total spent — full width on lg */}
              <div className="col-span-3 bg-gradient-to-br from-[#0F4C75] to-[#00539F] rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-black text-white">
                    {loading ? "—" : formatPrice(stats.totalSpent)}
                  </p>
                  <p className="text-sm text-blue-200 mt-0.5">Total spent (excl. cancelled)</p>
                </div>
                <div className="ml-auto shrink-0">
                  <ReceiptText className="h-10 w-10 text-white/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Order history */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white text-lg">
                <Package className="h-5 w-5 text-[#00539F]" />
                Order History
                {!loading && !filterLoading && (
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                    ({displayOrders.length})
                  </span>
                )}
              </h2>
              <DateFilter filter={dateFilter} align="right" />
            </div>

            {loading || filterLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="animate-pulse h-20 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : allOrders.length === 0 ? (
              <div className="text-center py-14">
                <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-full p-5 mb-4">
                  <ShoppingBag className="h-9 w-9 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-semibold mb-1">No orders yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Start exploring and place your first order.</p>
                <Link href="/products" className="px-6 py-2.5 bg-[#00539F] text-white text-sm font-bold rounded-2xl hover:bg-[#003B7A] transition-colors shadow-sm">
                  Start shopping
                </Link>
              </div>
            ) : displayOrders.length === 0 ? (
              <div className="text-center py-14">
                <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-full p-5 mb-4">
                  <Filter className="h-9 w-9 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-semibold mb-1">No orders in this period</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Try a different date range.</p>
                <button onClick={dateFilter.reset} className="text-[#00539F] dark:text-blue-400 text-sm font-bold hover:underline">
                  Clear filter
                </button>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {displayOrders.map((order) => (
                  <li key={order._id}>
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-[#00539F]/40 dark:hover:border-blue-500/40 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all group"
                    >
                      {/* Order icon */}
                      <div className="w-10 h-10 rounded-xl bg-[#00539F]/8 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Package className="h-4.5 w-4.5 text-[#00539F] dark:text-blue-400" style={{ width: "1.125rem", height: "1.125rem" }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-black text-[#00539F] dark:text-blue-400 tracking-wide">
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(order.createdAt)} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <p className="font-black text-gray-900 dark:text-white">{formatPrice(order.total)}</p>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#00539F] dark:group-hover:text-blue-400 transition-colors" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Addresses tab */}
      {activeTab === "addresses" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <AddressSection />
        </div>
      )}
    </div>
  );
}
