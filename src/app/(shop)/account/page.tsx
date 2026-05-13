"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Package, ChevronRight, LogOut, ShoppingBag, MapPin, Filter } from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { formatPrice } from "@/lib/utils/format";
import { useDateFilter } from "@/hooks/useDateFilter";
import DateFilter from "@/components/ui/DateFilter";
import type { Order } from "@/types";
import AddressSection from "@/components/account/AddressSection";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending:    "bg-yellow-50  dark:bg-yellow-900/20 text-yellow-700  dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/40",
  processing: "bg-blue-50    dark:bg-blue-900/20   text-blue-700    dark:text-blue-400   border-blue-200   dark:border-blue-800/40",
  shipped:    "bg-purple-50  dark:bg-purple-900/20 text-purple-700  dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
  delivered:  "bg-green-50   dark:bg-green-900/20  text-green-700   dark:text-green-400  border-green-200  dark:border-green-800/40",
  cancelled:  "bg-red-50     dark:bg-red-900/20    text-red-700     dark:text-red-400    border-red-200    dark:border-red-800/40",
};

function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

type Tab = "overview" | "addresses";

const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "overview",  label: "Overview",   Icon: User },
  { id: "addresses", label: "Addresses",  Icon: MapPin },
];

export default function AccountPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user, token, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const dateFilter = useDateFilter("all");

  // Client-side filtering on fetched orders
  const filteredOrders = useMemo(
    () => orders.filter((o) => dateFilter.isInRange(o.createdAt)),
    [orders, dateFilter],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login?redirect=/account");
      return;
    }
    if (!token) return;

    async function load() {
      try {
        const { data: json } = await axios.get("/api/account/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(json.data ?? []);
      } catch (err) {
        const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
        setError(msg ?? "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [hydrated, user, router, token]);

  if (!hydrated || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto" />
        </div>
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-6">My Account</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-8 w-full sm:w-auto sm:inline-flex">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Profile card */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="inline-flex bg-[#00539F]/10 rounded-full p-3">
                  <User className="h-7 w-7 text-[#00539F]" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="space-y-1 text-sm border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 dark:text-gray-400">Member since</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 dark:text-gray-400">Total orders</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{orders.length}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </div>
          </div>

          {/* Order history */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              {/* Header with date filter */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white">
                  <Package className="h-5 w-5 text-[#00539F]" aria-hidden />
                  Order history
                  {!loading && (
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                      ({filteredOrders.length})
                    </span>
                  )}
                </h2>
                <DateFilter filter={dateFilter} align="right" />
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-pulse h-20 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-full p-4 mb-4">
                    <ShoppingBag className="h-8 w-8 text-gray-400 dark:text-gray-500" aria-hidden />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No orders yet.</p>
                  <Link
                    href="/products"
                    className="px-5 py-2 bg-[#00539F] text-white text-sm font-semibold rounded-xl hover:bg-[#003B7A] transition-colors"
                  >
                    Start shopping
                  </Link>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-full p-4 mb-4">
                    <Filter className="h-8 w-8 text-gray-400 dark:text-gray-500" aria-hidden />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No orders in this period.</p>
                  <button
                    onClick={dateFilter.reset}
                    className="text-[#00539F] dark:text-blue-400 text-sm font-semibold hover:underline"
                  >
                    Clear filter
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredOrders.map((order) => (
                    <li key={order._id}>
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-[#00539F]/30 dark:hover:border-blue-500/40 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-[#00539F] dark:text-blue-400 tracking-wide">
                              {order.orderNumber}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(order.createdAt)} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-gray-900 dark:text-white">{formatPrice(order.total)}</p>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#00539F] transition-colors ml-auto mt-1" aria-hidden />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
