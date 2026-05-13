"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package, ShoppingBag, CreditCard, Truck } from "lucide-react";

export default function ConfirmationContent() {
  const sp          = useSearchParams();
  const orderNumber = sp.get("order") ?? "ORD-XXXXXXXX";
  const total       = sp.get("total") ? `£${Number(sp.get("total")).toFixed(2)}` : null;
  const email       = sp.get("email") ?? "";
  const pm          = sp.get("pm") as "razorpay" | "cod" | null;

  const isCOD = pm === "cod";

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {/* Icon */}
      <div className="inline-flex bg-green-50 rounded-full p-5 mb-6">
        <CheckCircle className="h-14 w-14 text-green-500" aria-hidden />
      </div>

      <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
        {isCOD ? "Order confirmed!" : "Payment successful!"}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">
        {email ? `We've sent a confirmation to ${email}.` : "Thank you for your order."}
        {" "}{isCOD ? "Pay when your groceries arrive at your door." : "Your groceries will be with you soon."}
      </p>

      {/* Payment method badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-4
        bg-blue-50 dark:bg-blue-900/20 text-[#00539F] dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
        {isCOD
          ? <><Truck    className="h-3.5 w-3.5" /> Cash on Delivery</>
          : <><CreditCard className="h-3.5 w-3.5" /> Paid via Razorpay</>
        }
      </div>

      {/* Order number card */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 mb-8 inline-block min-w-[260px]">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
          Order reference
        </p>
        <p className="text-xl font-black text-[#00539F] dark:text-blue-400 tracking-wide">{orderNumber}</p>
        {total && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isCOD ? "Amount to pay:" : "Total charged:"}{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span>
          </p>
        )}
      </div>

      {/* What's next */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-8 text-left space-y-3">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
          What happens next?
        </h2>
        {(isCOD
          ? [
              { icon: Package,     text: "We're preparing your order for dispatch." },
              { icon: Truck,       text: "Please keep the exact cash amount ready at delivery." },
              { icon: ShoppingBag, text: "You'll receive a delivery update by email." },
            ]
          : [
              { icon: Package,     text: "We're preparing your order for dispatch." },
              { icon: ShoppingBag, text: "You'll receive a delivery update by email." },
            ]
        ).map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
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
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-sm hover:border-gray-400 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
