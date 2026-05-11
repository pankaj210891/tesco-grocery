"use client";

import { useState } from "react";
import { Tag, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";

const FREE_DELIVERY_THRESHOLD = 40;
const DELIVERY_COST           = 3.99;
const VALID_PROMOS: Record<string, { pct: number; label: string }> = {
  TESCO10: { pct: 0.1,  label: "10% off your order" },
  FRESH5:  { pct: 0.05, label: "5% off fresh items"  },
  SAVE15:  { pct: 0.15, label: "15% off today only"  },
};

interface Props {
  subtotal:    number;
  isSubmitting: boolean;
  onPromoChange: (code: string | undefined) => void;
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={cn("font-semibold text-gray-900 dark:text-white", className)}>{value}</span>
    </div>
  );
}

export default function CheckoutPricingSummary({ subtotal, isSubmitting, onPromoChange }: Props) {
  const [input,        setInput]        = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number; label: string } | null>(null);
  const [error,        setError]        = useState("");

  const deliveryCost = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
  const discount     = appliedPromo ? subtotal * appliedPromo.pct : 0;
  const total        = subtotal + deliveryCost - discount;

  function applyPromo() {
    const code  = input.trim().toUpperCase();
    const promo = VALID_PROMOS[code];
    if (promo) {
      setAppliedPromo({ code, ...promo });
      setError("");
      setInput("");
      onPromoChange(code);
      toast.success(`${code} applied — ${promo.label}`);
    } else {
      setError("Invalid promo code. Try TESCO10.");
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    onPromoChange(undefined);
    toast.success("Promo code removed.");
  }

  return (
    <div className="space-y-4">
      {/* Promo code */}
      {appliedPromo ? (
        <div className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <Tag className="h-3.5 w-3.5" />
            {appliedPromo.code} — {appliedPromo.label}
          </div>
          <button onClick={removePromo} aria-label="Remove promo code">
            <X className="h-4 w-4 text-green-600 hover:text-green-800" />
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && applyPromo()}
              placeholder="Promo code"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:normal-case placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#00539F] focus:ring-2 focus:ring-blue-100 uppercase"
            />
            <button
              type="button"
              onClick={applyPromo}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors"
            >
              Apply
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {/* Price breakdown */}
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        <Row
          label="Delivery"
          value={deliveryCost === 0 ? "Free" : formatPrice(deliveryCost)}
          className={deliveryCost === 0 ? "text-green-600" : ""}
        />
        {appliedPromo && (
          <Row
            label={`${appliedPromo.code} discount`}
            value={`–${formatPrice(discount)}`}
            className="text-green-600"
          />
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="font-black text-gray-900 dark:text-white">Total</span>
          <span className="text-xl font-black text-gray-900 dark:text-white">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Place order */}
      <button
        type="submit"
        form="checkout-form"
        disabled={isSubmitting}
        className="w-full py-3 bg-[#00539F] hover:bg-[#003B7A] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Placing order…" : `Place order · ${formatPrice(total)}`}
      </button>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Secure checkout. No real payment is processed.
      </p>
    </div>
  );
}
