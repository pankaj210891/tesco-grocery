"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, MapPin, CreditCard, Truck, Receipt, XCircle, RotateCcw, Clock, Tag } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useHydrated } from "@/hooks/useHydrated";
import { useScrollLock } from "@/hooks/useScrollLock";
import { formatPrice } from "@/lib/utils/format";
import OrderTimeline from "@/components/account/OrderTimeline";
import VendorOrderTracking from "@/components/account/VendorOrderTracking";
import type { Order, VendorOrder } from "@/types";
import type { ReorderResult } from "@/app/api/account/orders/[orderNumber]/reorder/route";
import { use } from "react";

const CANCEL_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery time too long",
  "Item out of stock concern",
  "Other",
];

const STATUS_STYLES: Record<Order["status"], string> = {
  pending:               "bg-yellow-50 dark:bg-yellow-900/20  text-yellow-700 dark:text-yellow-400  border-yellow-200 dark:border-yellow-800/40",
  partially_confirmed:   "bg-blue-50   dark:bg-blue-900/20    text-blue-700   dark:text-blue-400    border-blue-200   dark:border-blue-800/40",
  processing:            "bg-amber-50  dark:bg-amber-900/20   text-amber-700  dark:text-amber-400   border-amber-200  dark:border-amber-800/40",
  shipped:               "bg-purple-50 dark:bg-purple-900/20  text-purple-700 dark:text-purple-400  border-purple-200 dark:border-purple-800/40",
  partially_delivered:   "bg-teal-50   dark:bg-teal-900/20    text-teal-700   dark:text-teal-400    border-teal-200   dark:border-teal-800/40",
  completed:             "bg-green-50  dark:bg-green-900/20   text-green-700  dark:text-green-400   border-green-200  dark:border-green-800/40",
  delivered:             "bg-green-50  dark:bg-green-900/20   text-green-700  dark:text-green-400   border-green-200  dark:border-green-800/40",
  partially_cancelled:   "bg-orange-50 dark:bg-orange-900/20  text-orange-700 dark:text-orange-400  border-orange-200 dark:border-orange-800/40",
  cancelled:             "bg-red-50    dark:bg-red-900/20     text-red-700    dark:text-red-400     border-red-200    dark:border-red-800/40",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  const router          = useRouter();
  const hydrated        = useHydrated();
  const { user, token } = useAuthStore();

  const { fetchCart } = useCartStore();

  const [order,         setOrder]         = useState<Order | null>(null);
  const [vendorOrders,  setVendorOrders]  = useState<VendorOrder[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [showCancel,    setShowCancel]    = useState(false);
  const [cancelReason,  setCancelReason]  = useState("");
  useScrollLock(showCancel);
  const [cancelComment, setCancelComment] = useState("");
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelError,   setCancelError]   = useState("");
  const [reordering,    setReordering]    = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace(`/login?redirect=/account/orders/${orderNumber}`);
      return;
    }

    async function fetchOrder() {
      try {
        const { data: json } = await axios.get(`/api/account/orders/${orderNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { vendorOrders: vos, ...orderData } = json.data;
        setOrder(orderData);
        setVendorOrders(vos ?? []);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError("Order not found.");
        } else {
          const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
          setError(msg ?? "Failed to load order.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [hydrated, user, token, orderNumber, router]);

  if (!hydrated || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Link href="/account" className="text-[#FCA311] dark:text-amber-400 text-sm font-semibold hover:underline">
          Back to account
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const isCOD         = order.paymentMethod === "cod";
  const isCancellable = (["pending", "processing", "partially_confirmed"] as Order["status"][]).includes(order.status);

  async function handleReorder() {
    if (!token || !order) return;
    setReordering(true);
    try {
      const { data: json } = await axios.post<{ success: boolean; data: ReorderResult }>(
        `/api/account/orders/${order.orderNumber}/reorder`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const { added, unavailable } = json.data;

      if (added.length > 0) {
        await fetchCart(token);
        toast.success(
          added.length === 1
            ? `${added[0].name} added to cart`
            : `${added.length} items added to cart`,
        );
      }

      if (unavailable.length > 0) {
        const names = unavailable.map((u) => u.name).join(", ");
        toast.warning(
          `Not available: ${names}`,
          { duration: 5000 },
        );
      }

      if (added.length === 0) {
        toast.error("None of the items are currently available");
      }
    } catch {
      toast.error("Failed to reorder. Please try again.");
    } finally {
      setReordering(false);
    }
  }

  async function handleCancelConfirm() {
    if (!order) return;
    setCancelling(true);
    setCancelError("");
    try {
      const { data: json } = await axios.post(
        `/api/account/orders/${order.orderNumber}/cancel`,
        { reason: cancelReason || undefined, comment: cancelComment.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setOrder(json.data);
      setShowCancel(false);
      setCancelReason("");
      setCancelComment("");
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setCancelError(msg ?? "Failed to cancel order. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* Back link */}
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to account
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border capitalize ${STATUS_STYLES[order.status]}`}>
            {order.status}
          </span>
          <button
            onClick={handleReorder}
            disabled={reordering}
            data-testid="reorder-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border border-[#FCA311]/60 bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {reordering ? "Adding…" : "Reorder"}
          </button>
          {isCancellable && (
            <button
              onClick={() => { setShowCancel(true); setCancelError(""); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <XCircle className="h-4 w-4" aria-hidden />
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">

        {/* Cancellation info */}
        {order.status === "cancelled" && (order.cancellationReason || order.cancellationComment) && (
          <section className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800/30 p-5">
            <h2 className="flex items-center gap-2 font-black text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">
              <XCircle className="h-4 w-4" aria-hidden />
              Cancellation Details
            </h2>
            {order.cancellationReason && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Reason:</span> {order.cancellationReason}
              </p>
            )}
            {order.cancellationComment && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span className="font-semibold">Note:</span> {order.cancellationComment}
              </p>
            )}
            {order.refundStatus && (
              <p className="text-sm mt-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Refund status: </span>
                <span className={`font-semibold capitalize ${
                  order.refundStatus === "processed" ? "text-green-600 dark:text-green-400"
                  : order.refundStatus === "failed"  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
                }`}>
                  {order.refundStatus}
                </span>
              </p>
            )}
          </section>
        )}

        {/* Order tracking timeline */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-5">
            <Truck className="h-4 w-4 text-[#FCA311]" aria-hidden />
            Order Tracking
          </h2>
          <OrderTimeline status={order.status} />
        </section>

        {/* Per-vendor tracking (shown when order has vendor sub-orders) */}
        {vendorOrders.length > 0 && <VendorOrderTracking vendorOrders={vendorOrders} />}

        {/* Items */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-4">
            <Package className="h-4 w-4 text-[#FCA311]" aria-hidden />
            Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
          </h2>
          <ul className="space-y-3">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 shrink-0 border border-gray-100 dark:border-gray-600">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                  {item.variantLabel && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <Tag className="h-3 w-3 shrink-0" aria-hidden />
                      {item.variantLabel}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatPrice(item.price)} × {item.quantity}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Delivery & Pricing row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Delivery */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-3">
              <MapPin className="h-4 w-4 text-[#FCA311]" aria-hidden />
              Delivery address
            </h2>
            <address className="not-italic text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
              <p className="font-semibold text-gray-900 dark:text-white">{order.delivery.fullName}</p>
              <p>{order.delivery.address}</p>
              <p>{order.delivery.city}, {order.delivery.postcode}</p>
              <p className="pt-1 text-gray-500 dark:text-gray-400">{order.delivery.phone}</p>
              <p className="text-gray-500 dark:text-gray-400">{order.delivery.email}</p>
            </address>
          </section>

          {/* Pricing */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-3">
              <CreditCard className="h-4 w-4 text-[#FCA311]" aria-hidden />
              Payment summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Delivery</span>
                <span className={`font-semibold ${order.deliveryFee === 0 ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>
                  {order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}
                </span>
              </div>
              {order.codCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> COD charge
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{formatPrice(order.codCharge)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{order.promoCode} discount</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">–{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="font-black text-gray-900 dark:text-white">Total</span>
                <span className="font-black text-gray-900 dark:text-white text-base">{formatPrice(order.total)}</span>
              </div>
            </div>
          </section>

        </div>

        {/* Delivery slot */}
        {order.deliverySlotDate && order.deliverySlotWindow && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-3">
              <Clock className="h-4 w-4 text-[#FCA311]" aria-hidden />
              Delivery Slot
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">
                {new Date(order.deliverySlotDate + "T00:00:00").toLocaleDateString("en-IN", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </span>
              {" — "}
              {order.deliverySlotWindow}
            </p>
          </section>
        )}

        {/* Payment method & transaction info */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-4">
            <Receipt className="h-4 w-4 text-[#FCA311]" aria-hidden />
            Transaction details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">Payment method</p>
              <div className="flex items-center gap-2">
                {isCOD
                  ? <><Truck className="h-4 w-4 text-amber-500" /><span className="font-semibold text-gray-800 dark:text-gray-100">Cash on Delivery</span></>
                  : <><CreditCard className="h-4 w-4 text-indigo-500" /><span className="font-semibold text-gray-800 dark:text-gray-100">Razorpay</span></>
                }
              </div>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">Payment status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                order.paymentStatus === "paid"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40"
                  : order.paymentStatus === "failed"
                  ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40"
                  : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/40"
              }`}>
                {order.paymentStatus}
              </span>
            </div>
            {order.razorpayPaymentId && (
              <div className="sm:col-span-2">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">Payment ID</p>
                <p className="font-mono text-xs bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 break-all">
                  {order.razorpayPaymentId}
                </p>
              </div>
            )}
            {order.razorpayOrderId && (
              <div className="sm:col-span-2">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">Razorpay Order ID</p>
                <p className="font-mono text-xs bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 break-all">
                  {order.razorpayOrderId}
                </p>
              </div>
            )}
          </div>
        </section>

      </div>

      {/* ── Cancel Order Modal ── */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Cancel Order</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Are you sure you want to cancel <span className="font-semibold">{order.orderNumber}</span>?
                </p>
              </div>
              <button
                onClick={() => setShowCancel(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XCircle className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Reason <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">Select a reason…</option>
                {CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Additional comments <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={cancelComment}
                onChange={(e) => setCancelComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Tell us more…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{cancelComment.length}/500</p>
            </div>

            {cancelError && (
              <p className="text-sm text-red-600 dark:text-red-400">{cancelError}</p>
            )}

            {!isCOD && (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2.5">
                Your payment of <strong>{formatPrice(order.total)}</strong> will be refunded to your original payment method within 5–7 business days.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowCancel(false)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
