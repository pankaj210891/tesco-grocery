"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";

const FREE_DELIVERY_THRESHOLD = 40;
const DELIVERY_COST = 3.99;

const VALID_PROMOS: Record<string, { pct: number; label: string }> = {
  TESCO10: { pct: 0.1,  label: "10% off your order"  },
  FRESH5:  { pct: 0.05, label: "5% off fresh items"  },
  SAVE15:  { pct: 0.15, label: "15% off today only"  },
};

interface OrderSummaryProps {
  subtotal: number;
}

export default function OrderSummary({ subtotal }: OrderSummaryProps) {
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    pct: number;
    label: string;
  } | null>(null);
  const [promoError, setPromoError] = useState("");

  const deliveryCost =
    subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
  const needed = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const discount = appliedPromo ? subtotal * appliedPromo.pct : 0;
  const total = subtotal + deliveryCost - discount;

  function applyPromo(e: React.FormEvent) {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    const promo = VALID_PROMOS[code];
    if (promo) {
      setAppliedPromo({ code, ...promo });
      setPromoError("");
      toast.success(`${code} applied — ${promo.label}`);
    } else {
      setPromoError("Invalid promo code. Try TESCO10.");
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput("");
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5 sticky top-20">
      <h2 className="text-base font-black text-gray-900 dark:text-white">Order Summary</h2>

      {/* Line items */}
      <ul className="space-y-2.5 text-sm">
        <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
        <SummaryRow
          label="Delivery"
          value={deliveryCost === 0 ? "Free" : formatPrice(deliveryCost)}
          valueClassName={deliveryCost === 0 ? "text-green-600 font-semibold" : ""}
        />
        {appliedPromo && (
          <SummaryRow
            label={`${appliedPromo.code} discount`}
            value={`–${formatPrice(discount)}`}
            valueClassName="text-green-600 font-semibold"
          />
        )}
      </ul>

      {/* Divider + total */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-baseline justify-between">
        <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
        <span className="text-2xl font-black text-gray-900 dark:text-white">
          {formatPrice(total)}
        </span>
      </div>

      {/* Free delivery progress */}
      <div className="space-y-1.5">
        <div
          className={cn(
            "text-xs font-medium",
            needed === 0 ? "text-green-600" : "text-[#00539F]"
          )}
        >
          {needed === 0
            ? "You qualify for free delivery! 🎉"
            : `Add ${formatPrice(needed)} more for free delivery`}
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00539F] rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress towards free delivery"
          />
        </div>
      </div>

      {/* Promo code */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Promo Code
        </p>
        {appliedPromo ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                {appliedPromo.code}
              </span>
            </div>
            <button
              onClick={removePromo}
              aria-label="Remove promo code"
              className="text-green-500 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={applyPromo} className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setPromoError("");
                }}
                placeholder="Enter code"
                aria-label="Promo code"
                className={cn(
                  "flex-1 border rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
                  "focus:outline-none focus:border-[#00539F] focus:ring-1 focus:ring-[#00539F]",
                  promoError ? "border-red-400" : "border-gray-300 dark:border-gray-600"
                )}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors"
              >
                Apply
              </button>
            </div>
            {promoError && (
              <p className="text-xs text-red-500" role="alert">
                {promoError}
              </p>
            )}
          </form>
        )}
      </div>

      {/* Checkout CTA */}
      <Link
        href="/checkout"
        className={cn(
          "block w-full text-center py-3.5 rounded-xl font-bold text-base",
          "bg-[#00539F] text-white hover:bg-[#003B7A] transition-all active:scale-[0.98] shadow-sm"
        )}
      >
        Proceed to Checkout →
      </Link>

      <Link
        href="/products"
        className="block text-center text-sm text-[#00539F] hover:underline font-medium"
      >
        ← Continue Shopping
      </Link>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className={cn("font-medium text-gray-900 dark:text-white", valueClassName)}>
        {value}
      </span>
    </li>
  );
}
