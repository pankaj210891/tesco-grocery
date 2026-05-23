"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Package, ChevronRight, LogOut, ShoppingBag,
  MapPin, Filter, Heart, HelpCircle, Plus,
} from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { formatPrice } from "@/lib/utils/format";
import { useDateFilter } from "@/hooks/useDateFilter";
import DateFilter from "@/components/ui/DateFilter";
import type { Order } from "@/types";
import AddressSection, { type AddressSectionHandle } from "@/components/account/AddressSection";
import AccountOverview from "@/components/account/AccountOverview";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending:             "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/40",
  partially_confirmed: "bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-400   border-blue-200   dark:border-blue-800/40",
  processing:          "bg-amber-50  dark:bg-amber-900/20  text-[#FCA311]  dark:text-amber-400  border-amber-200  dark:border-amber-800/40",
  shipped:             "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
  partially_delivered: "bg-teal-50   dark:bg-teal-900/20   text-teal-700   dark:text-teal-400   border-teal-200   dark:border-teal-800/40",
  completed:           "bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400  border-green-200  dark:border-green-800/40",
  delivered:           "bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400  border-green-200  dark:border-green-800/40",
  partially_cancelled: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/40",
  cancelled:           "bg-red-50    dark:bg-red-900/20    text-red-700    dark:text-red-400    border-red-200    dark:border-red-800/40",
};

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

type Tab = "overview" | "orders" | "addresses" | "wishlist";

const SIDEBAR_LINKS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "overview",  label: "Dashboard",       Icon: User    },
  { id: "orders",    label: "My Orders",       Icon: Package },
  { id: "addresses", label: "Saved Addresses", Icon: MapPin  },
  { id: "wishlist",  label: "Wishlist",        Icon: Heart   },
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
  const [addressCount,         setAddressCount]         = useState<number | null>(null);
  const addressSectionRef = useRef<AddressSectionHandle>(null);

  const dateFilter = useDateFilter("all");

  const fromParam = dateFilter.range.from ? localDateStr(dateFilter.range.from) : "";
  const toParam   = dateFilter.range.to   ? localDateStr(dateFilter.range.to)   : "";

  const currentFilterKey = `${fromParam}|${toParam}`;
  const filterLoading    = !!(fromParam || toParam) && fetchedFilterKey !== currentFilterKey;
  const displayOrders    = fromParam || toParam ? serverFilteredOrders : allOrders;

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
      } catch { /* leave previous results */ }
      finally { setFetchedFilterKey(key); }
    }
    void fetchFiltered();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromParam, toParam]);

  if (!hydrated || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map((n) => <div key={n} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  function handleLogout() { logout(); router.push("/"); }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start">

        {/* ── Left sidebar ─────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-3 sticky top-20">
          {/* Profile card */}
          <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                style={{ background: "linear-gradient(135deg, #0F4C75, #FCA311)" }}
              >
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate text-sm leading-tight">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            </div>

            <nav className="space-y-0.5">
              {SIDEBAR_LINKS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === id
                      ? "bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {activeTab === id && <ChevronRight className="h-3.5 w-3.5 ml-auto text-[#FCA311]" />}
                </button>
              ))}
            </nav>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-0.5">
              <Link
                href="/help"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <HelpCircle className="h-4 w-4 shrink-0" />
                Help & Support
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* ── Mobile tab bar ── */}
        <div className="lg:hidden w-full mb-2">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {SIDEBAR_LINKS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  activeTab === id
                    ? "bg-[#FCA311] text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── Dashboard / Overview ── */}
          {activeTab === "overview" && (
            <AccountOverview
              userName={user.name}
              userEmail={user.email}
              orders={allOrders}
              ordersLoading={loading}
              onSwitchTab={setActiveTab}
            />
          )}

          {/* ── Orders ── */}
          {activeTab === "orders" && (
            <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 relative z-10">
                <h2 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#FCA311]" />
                  Order History
                  {!loading && !filterLoading && (
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({displayOrders.length})</span>
                  )}
                </h2>
                <DateFilter filter={dateFilter} align="right" />
              </div>

              <div className="p-5 min-h-[320px]">
                {loading || filterLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => <div key={n} className="h-16 animate-pulse bg-gray-100 dark:bg-gray-700/40 rounded-xl" />)}
                  </div>
                ) : error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : allOrders.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">No orders yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Start exploring and place your first order.</p>
                    <Link href="/products" className="px-5 py-2 bg-[#FCA311] text-white text-sm font-bold rounded-xl hover:bg-[#E8920A] transition-colors">
                      Start shopping
                    </Link>
                  </div>
                ) : displayOrders.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                      <Filter className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">No orders in this period</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Try a different date range.</p>
                    <button onClick={dateFilter.reset} className="text-[#FCA311] dark:text-amber-400 text-sm font-bold hover:underline">
                      Clear filter
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {displayOrders.map((order) => <OrderRow key={order._id} order={order} />)}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── Addresses ── */}
          {activeTab === "addresses" && (
            <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 relative z-10">
                <h2 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#FCA311]" />
                  Saved Addresses
                  {addressCount !== null && (
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                      ({addressCount})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => addressSectionRef.current?.openAddModal()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#FCA311] text-white text-sm font-semibold rounded-xl hover:bg-[#E8920A] transition-colors"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Add address
                </button>
              </div>
              <div className="p-5">
                <AddressSection
                  ref={addressSectionRef}
                  showHeader={false}
                  onCountChange={setAddressCount}
                />
              </div>
            </div>
          )}

          {/* ── Wishlist shortcut ── */}
          {activeTab === "wishlist" && (
            <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Your Wishlist</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">View and manage your saved products.</p>
              <Link href="/account/wishlist" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FCA311] text-white font-semibold rounded-xl text-sm hover:bg-[#E8920A] transition-colors">
                Go to Wishlist
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <li>
      <Link
        href={`/account/orders/${order.orderNumber}`}
        className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 hover:border-[#FCA311]/40 dark:hover:border-amber-500/30 hover:bg-amber-50/30 dark:hover:bg-amber-900/5 transition-colors group"
      >
        <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
          <Package className="h-4 w-4 text-[#FCA311]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-bold text-[#FCA311] dark:text-amber-400 tracking-wide">
              {order.orderNumber}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(order.createdAt)} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          <p className="font-bold text-gray-900 dark:text-white text-sm">{formatPrice(order.total)}</p>
          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-[#FCA311] transition-colors" />
        </div>
      </Link>
    </li>
  );
}
