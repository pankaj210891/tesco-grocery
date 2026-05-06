"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package, ShoppingBag } from "lucide-react";

export default function ConfirmationContent() {
  const sp          = useSearchParams();
  const orderNumber = sp.get("order") ?? "ORD-XXXXXXXX";
  const total       = sp.get("total") ? `£${Number(sp.get("total")).toFixed(2)}` : null;
  const email       = sp.get("email") ?? "";

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {/* Icon */}
      <div className="inline-flex bg-green-50 rounded-full p-5 mb-6">
        <CheckCircle className="h-14 w-14 text-green-500" aria-hidden />
      </div>

      <h1 className="text-2xl font-black text-gray-900 mb-2">
        Order placed!
      </h1>
      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
        {email
          ? `We've sent a confirmation to ${email}.`
          : "Thank you for your order."}
        {" "}Your groceries will be with you soon.
      </p>

      {/* Order number card */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-8 inline-block min-w-[260px]">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
          Order reference
        </p>
        <p className="text-xl font-black text-[#00539F] tracking-wide">{orderNumber}</p>
        {total && (
          <p className="text-sm text-gray-500 mt-1">Total charged: <span className="font-semibold text-gray-700">{total}</span></p>
        )}
      </div>

      {/* What's next */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8 text-left space-y-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
          What happens next?
        </h2>
        {[
          { icon: Package,     text: "We're preparing your order for dispatch." },
          { icon: ShoppingBag, text: "You'll receive a delivery update by email." },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-3 text-sm text-gray-600">
            <Icon className="h-4 w-4 text-[#00539F] mt-0.5 shrink-0" aria-hidden />
            {text}
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/products"
          className="px-6 py-2.5 bg-[#00539F] text-white font-semibold rounded-xl text-sm hover:bg-[#003B7A] transition-colors"
        >
          Continue shopping
        </Link>
        <Link
          href="/"
          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl text-sm hover:border-gray-400 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
