"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, MapPin, CreditCard } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { formatPrice } from "@/lib/utils/format";
import type { Order } from "@/types";
import { use } from "react";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending:    "bg-yellow-50  text-yellow-700  border-yellow-200",
  processing: "bg-blue-50    text-blue-700    border-blue-200",
  shipped:    "bg-purple-50  text-purple-700  border-purple-200",
  delivered:  "bg-green-50   text-green-700   border-green-200",
  cancelled:  "bg-red-50     text-red-700     border-red-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
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
        const res  = await fetch(`/api/account/orders/${orderNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (res.ok)            setOrder(json.data);
        else if (res.status === 404) setError("Order not found.");
        else                   setError(json.error ?? "Failed to load order.");
      } catch {
        setError("Something went wrong.");
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
          <div className="h-6 bg-gray-200 rounded w-40" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="h-32 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/account" className="text-[#00539F] text-sm font-semibold hover:underline">
          Back to account
        </Link>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* Back link */}
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to account
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`self-start sm:self-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border capitalize ${STATUS_STYLES[order.status]}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-5">

        {/* Items */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="flex items-center gap-2 font-black text-gray-900 mb-4">
            <Package className="h-4 w-4 text-[#00539F]" aria-hidden />
            Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
          </h2>
          <ul className="space-y-3">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatPrice(item.price)} × {item.quantity}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Delivery & Pricing row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Delivery */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="flex items-center gap-2 font-black text-gray-900 mb-3">
              <MapPin className="h-4 w-4 text-[#00539F]" aria-hidden />
              Delivery address
            </h2>
            <address className="not-italic text-sm text-gray-600 space-y-0.5">
              <p className="font-semibold text-gray-900">{order.delivery.fullName}</p>
              <p>{order.delivery.address}</p>
              <p>{order.delivery.city}, {order.delivery.postcode}</p>
              <p className="pt-1 text-gray-500">{order.delivery.phone}</p>
              <p className="text-gray-500">{order.delivery.email}</p>
            </address>
          </section>

          {/* Pricing */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="flex items-center gap-2 font-black text-gray-900 mb-3">
              <CreditCard className="h-4 w-4 text-[#00539F]" aria-hidden />
              Payment summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span className={`font-semibold ${order.deliveryFee === 0 ? "text-green-600" : "text-gray-900"}`}>
                  {order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{order.promoCode} discount</span>
                  <span className="font-semibold text-green-600">–{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="font-black text-gray-900">Total</span>
                <span className="font-black text-gray-900 text-base">{formatPrice(order.total)}</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
