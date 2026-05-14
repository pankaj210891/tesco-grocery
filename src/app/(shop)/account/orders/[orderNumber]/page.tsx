"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, MapPin, CreditCard, Truck, Receipt } from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { formatPrice } from "@/lib/utils/format";
import OrderTimeline from "@/components/account/OrderTimeline";
import type { Order } from "@/types";
import { use } from "react";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending:    "bg-yellow-50 dark:bg-yellow-900/20  text-yellow-700 dark:text-yellow-400  border-yellow-200 dark:border-yellow-800/40",
  processing: "bg-amber-50  dark:bg-amber-900/20   text-amber-700  dark:text-amber-400   border-amber-200  dark:border-amber-800/40",
  shipped:    "bg-purple-50 dark:bg-purple-900/20  text-purple-700 dark:text-purple-400  border-purple-200 dark:border-purple-800/40",
  delivered:  "bg-green-50  dark:bg-green-900/20   text-green-700  dark:text-green-400   border-green-200  dark:border-green-800/40",
  cancelled:  "bg-red-50    dark:bg-red-900/20     text-red-700    dark:text-red-400     border-red-200    dark:border-red-800/40",
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

  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

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
        setOrder(json.data);
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

  const isCOD = order.paymentMethod === "cod";

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
        <span className={`self-start sm:self-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border capitalize ${STATUS_STYLES[order.status]}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-5">

        {/* Order tracking timeline */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-5">
            <Truck className="h-4 w-4 text-[#FCA311]" aria-hidden />
            Order Tracking
          </h2>
          <OrderTimeline status={order.status} />
        </section>

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
    </div>
  );
}
