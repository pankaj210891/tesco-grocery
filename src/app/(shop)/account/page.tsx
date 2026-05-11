"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Package, ChevronRight, LogOut, ShoppingBag, MapPin, CreditCard } from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { formatPrice } from "@/lib/utils/format";
import type { Order } from "@/types";
import AddressSection from "@/components/account/AddressSection";
import PaymentSection from "@/components/account/PaymentSection";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending:    "bg-yellow-50  text-yellow-700  border-yellow-200",
  processing: "bg-blue-50    text-blue-700    border-blue-200",
  shipped:    "bg-purple-50  text-purple-700  border-purple-200",
  delivered:  "bg-green-50   text-green-700   border-green-200",
  cancelled:  "bg-red-50     text-red-700     border-red-200",
};

function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

type Tab = "overview" | "addresses" | "payments";

const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "overview",   label: "Overview",        Icon: User },
  { id: "addresses",  label: "Addresses",        Icon: MapPin },
  { id: "payments",   label: "Payment Methods",  Icon: CreditCard },
];

export default function AccountPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user, token, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

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
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
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
      <h1 className="text-2xl font-black text-gray-900 mb-6">My Account</h1>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-full sm:w-auto sm:inline-flex">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === id
                ? "bg-white text-[#00539F] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Profile card */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="inline-flex bg-[#00539F]/10 rounded-full p-3">
                  <User className="h-7 w-7 text-[#00539F]" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              <div className="space-y-1 text-sm border-t border-gray-100 pt-4">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Member since</span>
                  <span className="font-semibold text-gray-800">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Total orders</span>
                  <span className="font-semibold text-gray-800">{orders.length}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </div>
          </div>

          {/* Order history */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="flex items-center gap-2 font-black text-gray-900 mb-5">
                <Package className="h-5 w-5 text-[#00539F]" aria-hidden />
                Order history
              </h2>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-pulse h-20 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex bg-gray-100 rounded-full p-4 mb-4">
                    <ShoppingBag className="h-8 w-8 text-gray-400" aria-hidden />
                  </div>
                  <p className="text-gray-500 text-sm mb-4">No orders yet.</p>
                  <Link
                    href="/products"
                    className="px-5 py-2 bg-[#00539F] text-white text-sm font-semibold rounded-xl hover:bg-[#003B7A] transition-colors"
                  >
                    Start shopping
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {orders.map((order) => (
                    <li key={order._id}>
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#00539F]/30 hover:bg-blue-50/30 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-[#00539F] tracking-wide">
                              {order.orderNumber}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.createdAt)} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-gray-900">{formatPrice(order.total)}</p>
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

      {/* ── Addresses tab ───────────────────────────────────── */}
      {activeTab === "addresses" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <AddressSection />
        </div>
      )}

      {/* ── Payments tab ────────────────────────────────────── */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <PaymentSection />
        </div>
      )}
    </div>
  );
}
