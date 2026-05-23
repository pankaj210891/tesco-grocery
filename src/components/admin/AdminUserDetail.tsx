"use client";

import { useEffect, useState } from "react";
import { X, ShoppingBag, MapPin, TrendingUp, AlertCircle, Mail, Calendar, BadgeCheck, Ban } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useScrollLock } from "@/hooks/useScrollLock";
import { authClient } from "@/lib/axios";
import { formatPrice } from "@/lib/utils/format";
import type { UserDetail, Order } from "@/types";

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const ROLE_COLORS: Record<string, string> = {
  admin:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  vendor:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  customer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

interface Props {
  userId:   string;
  onClose:  () => void;
}

type TabId = "overview" | "orders" | "addresses";

export function AdminUserDetail({ userId, onClose }: Props) {
  const { token } = useAuthStore();
  const [detail, setDetail]   = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [tab, setTab]         = useState<TabId>("overview");

  useScrollLock(true);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    authClient(token).get<{ success: boolean; data: UserDetail; error?: string }>(`/api/admin/users/${userId}`)
      .then((res) => {
        if (res.data.success) setDetail(res.data.data);
        else setError(res.data.error ?? "Failed to load user");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview",   label: "Overview" },
    { id: "orders",     label: `Orders${detail ? ` (${detail.orders.length})` : ""}` },
    { id: "addresses",  label: `Addresses${detail ? ` (${detail.addresses.length})` : ""}` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      data-testid="user-detail-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0F4C75] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {detail?.name ? detail.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100" data-testid="user-detail-name">
                {detail?.name ?? "User Details"}
              </h2>
              {detail && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[detail.role] ?? ""}`}>
                    {detail.role}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    detail.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}>
                    {detail.status}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} data-testid="user-detail-close" aria-label="Close">
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2.5 px-1 mr-4 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[#0F4C75] text-[#0F4C75] dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              data-testid={`user-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Overview tab */}
              {tab === "overview" && (
                <div className="space-y-6">
                  {/* Contact info */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Contact</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>{detail.email}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>Joined {new Date(detail.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>
                      {detail.status === "active" ? (
                        <div className="flex items-center gap-2.5 text-sm text-green-600 dark:text-green-400">
                          <BadgeCheck className="h-4 w-4 shrink-0" />
                          <span>Account active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 text-sm text-red-600 dark:text-red-400">
                          <Ban className="h-4 w-4 shrink-0" />
                          <span>Account suspended</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Analytics */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Analytics
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="user-analytics">
                      <StatCard label="Orders" value={String(detail.analytics.totalOrders)} />
                      <StatCard label="Spent" value={formatPrice(detail.analytics.totalSpent)} highlight />
                      <StatCard label="Cancelled" value={String(detail.analytics.cancelledOrders)} warn={detail.analytics.cancelledOrders > 0} />
                      <StatCard label="Refunded" value={String(detail.analytics.refundedOrders)} warn={detail.analytics.refundedOrders > 0} />
                    </div>
                    {detail.analytics.lastOrderDate && (
                      <p className="text-xs text-gray-400 mt-2">
                        Last order: {new Date(detail.analytics.lastOrderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Orders tab */}
              {tab === "orders" && (
                <div className="space-y-2">
                  {detail.orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <ShoppingBag className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No orders yet</p>
                    </div>
                  ) : (
                    detail.orders.map((order: Order) => (
                      <div key={order._id} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800 last:border-0" data-testid="user-order-row">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatPrice(order.total)}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ORDER_STATUS_COLORS[order.status] ?? ""}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Addresses tab */}
              {tab === "addresses" && (
                <div className="space-y-3">
                  {detail.addresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <MapPin className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No saved addresses</p>
                    </div>
                  ) : (
                    detail.addresses.map((addr) => (
                      <div key={addr._id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4" data-testid="user-address-card">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#0F4C75] dark:text-blue-400 uppercase">
                            {addr.customLabel ?? addr.label}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[11px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{addr.fullName}</p>
                        <p className="text-sm text-gray-500">{addr.phone}</p>
                        <p className="text-sm text-gray-500">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                        <p className="text-sm text-gray-500">{addr.city}, {addr.postcode}</p>
                        <p className="text-sm text-gray-500">{addr.country}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
      <p className={`text-base font-bold ${highlight ? "text-[#0F4C75] dark:text-blue-400" : warn ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
        {value}
      </p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
