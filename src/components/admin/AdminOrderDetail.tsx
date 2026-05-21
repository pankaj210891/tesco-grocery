"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X, Package, User, MapPin, CreditCard, RefreshCw,
  CheckCircle, Clock, Truck, XCircle, AlertCircle, Store, ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import { useScrollLock } from "@/hooks/useScrollLock";
import { formatPrice } from "@/lib/utils/format";
import {
  ADMIN_TRANSITIONS,
  STATUS_META,
  TERMINAL_STATUSES,
  type VendorOrderStatus,
} from "@/constants/order-status";
import type { OrderDetail, VendorOrder } from "@/types";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:    <Clock className="h-4 w-4" />,
  processing: <RefreshCw className="h-4 w-4" />,
  shipped:    <Truck className="h-4 w-4" />,
  delivered:  <CheckCircle className="h-4 w-4" />,
  cancelled:  <XCircle className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  pending:               "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  partially_confirmed:   "bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300",
  processing:            "bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300",
  shipped:               "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  partially_delivered:   "bg-teal-100   text-teal-700   dark:bg-teal-900/40   dark:text-teal-300",
  completed:             "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300",
  delivered:             "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300",
  partially_cancelled:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  cancelled:             "bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid:               "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300",
  pending:            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  failed:             "bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300",
  refunded:           "bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400",
  partially_refunded: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

const TIMELINE_STEPS = ["pending", "processing", "shipped", "delivered"] as const;

interface RefundFormState {
  type:   "full" | "partial";
  reason: string;
  amount: string;
}

const EMPTY_REFUND: RefundFormState = { type: "full", reason: "", amount: "" };

interface Props {
  orderId:  string;
  onClose:  () => void;
  onUpdate: (updated: OrderDetail) => void;
}

// ─── Vendor sub-order override row ───────────────────────────────────────────

interface VendorOverrideRowProps {
  vo:       VendorOrder;
  token:    string;
  onUpdate: (updated: VendorOrder) => void;
}

function VendorOverrideRow({ vo, token, onUpdate }: VendorOverrideRowProps) {
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [note,    setNote]    = useState("");
  const [showNote, setShowNote] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<VendorOrderStatus | "">("");

  const allowedNext = (ADMIN_TRANSITIONS[vo.status as VendorOrderStatus] ?? []) as VendorOrderStatus[];
  const isTerminal  = TERMINAL_STATUSES.has(vo.status as VendorOrderStatus);
  const meta        = STATUS_META[vo.status as VendorOrderStatus];

  async function applyOverride() {
    if (!pendingStatus) return;
    setSaving(true);
    setError("");
    try {
      const client = authClient(token);
      const res    = await client.patch<{ success: boolean; data: VendorOrder; error?: string }>(
        `/api/admin/vendor-orders/${vo._id}`,
        { status: pendingStatus, note: note.trim() || undefined },
      );
      if (res.data.success && res.data.data) {
        onUpdate(res.data.data);
        setPendingStatus("");
        setNote("");
        setShowNote(false);
      } else {
        setError(res.data.error ?? "Failed to update");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Store className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{vo.vendorName}</span>
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${meta?.bgCls ?? ""} ${meta?.colorCls ?? ""}`}>
            {meta?.label ?? vo.status}
          </span>
        </div>

        {!isTerminal && allowedNext.length > 0 ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={pendingStatus}
                onChange={(e) => {
                  setPendingStatus(e.target.value as VendorOrderStatus | "");
                  setShowNote(!!e.target.value);
                  setError("");
                }}
                className="appearance-none text-xs pl-2 pr-6 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                data-testid={`admin-override-status-${vo._id}`}
              >
                <option value="">Override status…</option>
                {allowedNext.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-gray-400 italic">
            {isTerminal ? "Terminal — no further transitions" : "No valid transitions"}
          </span>
        )}
      </div>

      {/* Optional note + confirm */}
      {showNote && pendingStatus && (
        <div className="space-y-2 pt-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Admin note (optional)"
            maxLength={300}
            className="w-full text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
            data-testid={`admin-override-note-${vo._id}`}
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setPendingStatus(""); setNote(""); setShowNote(false); setError(""); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => void applyOverride()}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 font-semibold"
              data-testid={`admin-override-confirm-${vo._id}`}
            >
              {saving ? "Saving…" : `Set ${STATUS_META[pendingStatus as VendorOrderStatus]?.label ?? pendingStatus}`}
            </button>
          </div>
        </div>
      )}

      {/* Last history entry preview */}
      {vo.statusHistory.length > 0 && (
        <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {vo.statusHistory.at(-1)?.note && (
            <span className="italic truncate">{vo.statusHistory.at(-1)?.note}</span>
          )}
          <span className="shrink-0">
            · {new Date(vo.statusHistory.at(-1)?.changedAt ?? "").toLocaleString("en-IN", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
          {vo.statusHistory.at(-1)?.role && (
            <span className="shrink-0 capitalize">· {vo.statusHistory.at(-1)?.role}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminOrderDetail({ orderId, onClose, onUpdate }: Props) {
  const { token } = useAuthStore();
  const [order, setOrder]   = useState<OrderDetail | null>(null);
  const [vendorOrders, setVendorOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [refundOpen, setRefundOpen]     = useState(false);
  const [refundForm, setRefundForm]     = useState<RefundFormState>(EMPTY_REFUND);
  const [refundSaving, setRefundSaving] = useState(false);
  const [refundError, setRefundError]   = useState("");

  useScrollLock(true);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const client = authClient(token);
    client.get<{ success: boolean; data: OrderDetail & { vendorOrders?: VendorOrder[] }; error?: string }>(
      `/api/admin/orders/${orderId}`,
    )
      .then((r) => {
        if (r.data.success) {
          const { vendorOrders: vos, ...orderData } = r.data.data;
          setOrder(orderData as OrderDetail);
          setVendorOrders(vos ?? []);
        } else {
          setError(r.data.error ?? "Failed to load order");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function submitRefund() {
    if (!order || !token) return;
    if (!refundForm.reason.trim()) { setRefundError("Reason is required"); return; }
    if (refundForm.type === "partial" && (!refundForm.amount || Number(refundForm.amount) <= 0)) {
      setRefundError("Enter a valid refund amount"); return;
    }

    setRefundSaving(true);
    setRefundError("");

    const body: Record<string, unknown> = {
      type:   refundForm.type,
      reason: refundForm.reason.trim(),
    };
    if (refundForm.type === "partial") body.amount = Number(refundForm.amount);

    try {
      const client = authClient(token);
      const res    = await client.post<{ success: boolean; data?: OrderDetail; error?: string }>(
        `/api/admin/orders/${orderId}/refund`,
        body,
      );
      if (!res.data.success) { setRefundError(res.data.error ?? "Refund failed"); return; }
      if (res.data.data) { setOrder(res.data.data); onUpdate(res.data.data); }
      setRefundOpen(false);
      setRefundForm(EMPTY_REFUND);
    } catch {
      setRefundError("Refund failed");
    } finally {
      setRefundSaving(false);
    }
  }

  const canRefund = order &&
    (order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded");

  const alreadyRefunded = order?.refundedAmount ?? 0;
  const maxRefundable   = order ? order.total - alreadyRefunded : 0;

  const activeStep = order
    ? order.status === "cancelled"
      ? -1
      : TIMELINE_STEPS.indexOf(order.status as typeof TIMELINE_STEPS[number])
    : -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      data-testid="order-detail-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100" data-testid="order-detail-number">
              {order ? `Order #${order.orderNumber}` : "Order Details"}
            </h2>
            {order && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(order.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>
          <button onClick={onClose} data-testid="order-detail-close" aria-label="Close">
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
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

          {order && !loading && (
            <>
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] ?? ""}`}>
                  {STATUS_ICONS[order.status]}
                  {order.status.replace(/_/g, " ")}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? ""}`}>
                  {order.paymentStatus.replace("_", " ")}
                </span>
                {order.refundStatus && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 capitalize">
                    Refund: {order.refundStatus}
                  </span>
                )}
              </div>

              {/* Timeline */}
              {order.status !== "cancelled" && (
                <div data-testid="order-timeline">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Progress</p>
                  <div className="flex items-center gap-0">
                    {TIMELINE_STEPS.map((step, idx) => (
                      <div key={step} className="flex items-center flex-1 last:flex-none">
                        <div className={`flex flex-col items-center gap-1 ${idx <= activeStep ? "text-[#0F4C75] dark:text-blue-400" : "text-gray-300 dark:text-gray-700"}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                            idx <= activeStep
                              ? "border-[#0F4C75] bg-[#0F4C75] text-white dark:border-blue-400 dark:bg-blue-400 dark:text-gray-900"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400"
                          }`}>
                            {idx < activeStep ? <CheckCircle className="h-3.5 w-3.5" /> : idx + 1}
                          </div>
                          <span className="text-[10px] font-semibold capitalize whitespace-nowrap">{step}</span>
                        </div>
                        {idx < TIMELINE_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 rounded ${idx < activeStep ? "bg-[#0F4C75] dark:bg-blue-400" : "bg-gray-200 dark:bg-gray-700"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Vendor sub-orders override panel ─────────────────────── */}
              {vendorOrders.length > 0 && token && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5" /> Vendor Sub-orders
                    <span className="ml-auto text-gray-300 dark:text-gray-600 normal-case font-normal">Admin override</span>
                  </p>
                  <div className="space-y-2">
                    {vendorOrders.map((vo) => (
                      <VendorOverrideRow
                        key={vo._id}
                        vo={vo}
                        token={token}
                        onUpdate={(updated) => {
                          setVendorOrders((prev) =>
                            prev.map((v) => (v._id === updated._id ? updated : v)),
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Order items */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Items ({order.items.length})
                </p>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                        {item.vendorName && (
                          <Link
                            href={`/admin/vendors?search=${encodeURIComponent(item.vendorName)}`}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {item.vendorName}
                          </Link>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(item.price * item.quantity)}</p>
                        <p className="text-xs text-gray-400">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Pricing
                </p>
                {[
                  { label: "Subtotal",     value: order.subtotal },
                  { label: "Delivery",     value: order.deliveryFee },
                  ...(order.codCharge > 0 ? [{ label: "COD Charge", value: order.codCharge }] : []),
                  ...(order.discount > 0  ? [{ label: "Discount",   value: -order.discount }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={`font-medium ${value < 0 ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-gray-100"}`}>
                      {value < 0 ? `−${formatPrice(-value)}` : formatPrice(value)}
                    </span>
                  </div>
                ))}
                {order.promoCode && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Promo</span><span>{order.promoCode}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-gray-900 dark:text-gray-100">{formatPrice(order.total)}</span>
                </div>
                {alreadyRefunded > 0 && (
                  <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400 font-medium pt-0.5">
                    <span>Refunded</span><span>−{formatPrice(alreadyRefunded)}</span>
                  </div>
                )}
              </div>

              {/* Customer info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Customer
                  </p>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{order.delivery.fullName}</p>
                    <p className="text-gray-500">{order.delivery.email}</p>
                    <p className="text-gray-500">{order.delivery.phone}</p>
                    {order.user && (
                      <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        order.user.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {order.user.role} · {order.user.status}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Delivery Address
                  </p>
                  <div className="space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                    <p>{order.delivery.address}</p>
                    <p>{order.delivery.city}</p>
                    <p>{order.delivery.postcode}</p>
                  </div>
                </div>
              </div>

              {/* Refund history */}
              {order.refundType && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase mb-2">Refund Details</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium capitalize text-gray-900 dark:text-gray-100">{order.refundType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">{formatPrice(alreadyRefunded)}</span>
                    </div>
                    {order.refundReason && (
                      <div className="pt-1">
                        <span className="text-xs text-gray-400">Reason: </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{order.refundReason}</span>
                      </div>
                    )}
                    {order.refundProcessedAt && (
                      <div className="text-xs text-gray-400 pt-0.5">
                        Processed: {new Date(order.refundProcessedAt).toLocaleDateString("en-IN")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Refund CTA */}
              {canRefund && !refundOpen && (
                <div className="flex justify-end">
                  <button
                    onClick={() => { setRefundOpen(true); setRefundForm(EMPTY_REFUND); setRefundError(""); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                    data-testid="open-refund-btn"
                  >
                    <RefreshCw className="h-4 w-4" /> Process Refund
                  </button>
                </div>
              )}

              {/* Refund form */}
              {refundOpen && (
                <div className="border border-orange-200 dark:border-orange-800/50 rounded-xl p-5 space-y-4 bg-orange-50/50 dark:bg-orange-950/10" data-testid="refund-form">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Process Refund</p>
                  <p className="text-xs text-gray-500">Max refundable: <strong className="text-gray-700 dark:text-gray-300">{formatPrice(maxRefundable)}</strong></p>

                  {refundError && (
                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2" data-testid="refund-error">
                      {refundError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {(["full", "partial"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setRefundForm((f) => ({ ...f, type: t }))}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors capitalize ${
                          refundForm.type === t
                            ? "border-orange-400 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                        data-testid={`refund-type-${t}`}
                      >
                        {t} refund
                        {t === "full" && ` (${formatPrice(maxRefundable)})`}
                      </button>
                    ))}
                  </div>

                  {refundForm.type === "partial" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={maxRefundable}
                        value={refundForm.amount}
                        onChange={(e) => setRefundForm((f) => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        data-testid="refund-amount-input"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={refundForm.reason}
                      onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="Reason for refund…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      data-testid="refund-reason-input"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setRefundOpen(false); setRefundForm(EMPTY_REFUND); setRefundError(""); }}
                      className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void submitRefund()}
                      disabled={refundSaving}
                      className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg transition-colors"
                      data-testid="submit-refund-btn"
                    >
                      {refundSaving ? "Processing…" : "Confirm Refund"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
