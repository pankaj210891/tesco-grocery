"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package, ShoppingBag, CreditCard, Truck, MapPin, ArrowRight, Clock } from "lucide-react";

const orderConfirmationGenericMessage =
  "Your order is confirmed and will be processed shortly.";

export default function ConfirmationContent() {
  const sp          = useSearchParams();
  const orderNumber = sp.get("order") ?? "ORD-XXXXXXXX";
  const totalRaw    = sp.get("total");
  const email       = sp.get("email") ?? "";
  const pm          = sp.get("pm") as "razorpay" | "cod" | null;
  const isCOD       = pm === "cod";

  const formattedTotal = totalRaw
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(totalRaw))
    : null;

  const NEXT_STEPS = isCOD
    ? [
        { icon: Package, title: "Order confirmed",       desc: "Your order has been received and is being prepared." },
        { icon: Clock,   title: "Out for delivery soon", desc: "We'll keep you updated at every step via email." },
        { icon: Truck,   title: "Pay on delivery",       desc: "Keep the exact cash amount ready when your order arrives." },
      ]
    : [
        { icon: Package,     title: "Payment successful", desc: "Your payment was confirmed and the order is being prepared." },
        { icon: Clock,       title: "Order processing",   desc: "We'll begin packing your items shortly." },
        { icon: ShoppingBag, title: "Out for delivery",   desc: "You'll receive a shipping update by email once dispatched." },
      ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-14 sm:py-20">

        {/* ── Success icon & headline ── */}
        <div className="text-center mb-10">
          <div className="relative inline-flex mb-6">
            {/* Outer glow ring */}
            <span className="absolute inset-0 rounded-full bg-green-400/20 dark:bg-green-400/10 animate-ping" style={{ animationDuration: "1.4s" }} />
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl shadow-green-500/30">
              <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={2.5} aria-hidden />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
            {isCOD ? "Order Confirmed!" : "Payment Successful!"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-base max-w-sm mx-auto leading-relaxed">
            {email
              ? <>Confirmation sent to <span className="font-semibold text-gray-700 dark:text-gray-200">{email}</span>.</>
              : "Thank you for shopping with us!"
            }
            {" "}
            {isCOD
              ? "Please keep the exact amount ready at delivery."
              : orderConfirmationGenericMessage}
          </p>
        </div>

        {/* ── Order summary card ── */}
        <div className="relative bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-100/80 dark:shadow-none overflow-hidden mb-6">
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#FCA311] to-[#E8920A]" />

          <div className="p-6 sm:p-8">
            {/* Payment badge */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border ${
                isCOD
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400"
                  : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-400"
              }`}>
                {isCOD
                  ? <><Truck className="h-4 w-4" /> Cash on Delivery</>
                  : <><CreditCard className="h-4 w-4" /> Paid via Razorpay</>
                }
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                ✓ Confirmed
              </span>
            </div>

            {/* Order number & total */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/60 rounded-2xl p-4">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                  Order reference
                </p>
                <p className="text-lg font-black text-[#FCA311] dark:text-amber-400 tracking-wide font-mono">
                  {orderNumber}
                </p>
              </div>

              {formattedTotal && (
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-2xl p-4">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                    {isCOD ? "Amount to pay" : "Amount charged"}
                  </p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tracking-wide">
                    {formattedTotal}
                  </p>
                </div>
              )}
            </div>

            {/* COD special note */}
            {isCOD && (
              <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Keep the exact cash amount ready. Our delivery partner will not carry change.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── What happens next ── */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 mb-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            What happens next
          </h2>
          <div className="space-y-5">
            {NEXT_STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-[#FCA311]/10 dark:bg-blue-900/30 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[#FCA311] dark:text-amber-400" aria-hidden />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
                <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Order tracking + cancellation note ── */}
        <div className="space-y-3 mb-8">
          <div className="bg-gradient-to-r from-[#FCA311]/5 to-indigo-500/5 dark:from-blue-900/20 dark:to-indigo-900/20 border border-[#FCA311]/20 dark:border-blue-800/40 rounded-2xl px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FCA311]/10 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <Package className="h-4 w-4 text-[#FCA311] dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Track your order</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">View live status in My Account → Order History.</p>
            </div>
            <Link
              href="/account"
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#FCA311] dark:text-amber-400 hover:underline"
            >
              View <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Need to cancel? You can cancel a <span className="font-semibold text-gray-700 dark:text-gray-300">pending</span> or <span className="font-semibold text-gray-700 dark:text-gray-300">processing</span> order from your{" "}
              <Link href="/account" className="text-[#FCA311] dark:text-amber-400 font-semibold hover:underline">Order History</Link>.
              {!isCOD && " Online payments are fully refunded."}
            </p>
          </div>
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#FCA311] hover:bg-[#E8920A] text-white font-bold rounded-2xl text-sm transition-colors transition-shadow transition-transform shadow-lg shadow-[#FCA311]/25 hover:shadow-[#E8920A]/30 hover:-translate-y-0.5"
          >
            <ShoppingBag className="h-4 w-4" />
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-2xl text-sm hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
