"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tag, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from "@/lib/constants/promos";
import { useCartStore } from "@/store/cart.store";
import type { Offer } from "@/types";

interface OrderSummaryProps {
  subtotal: number;
}

export default function OrderSummary({ subtotal }: OrderSummaryProps) {
  const promoCode    = useCartStore((s) => s.promoCode);
  const promoInfo    = useCartStore((s) => s.promoInfo);
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const setPromoInfo = useCartStore((s) => s.setPromoInfo);

  const [promoInput, setPromoInput]   = useState(promoCode ?? "");
  const [applying, setApplying]       = useState(false);
  const [availableCodes, setAvailableCodes] = useState<Offer[]>([]);

  useEffect(() => {
    fetch("/api/offers")
      .then((r) => r.json())
      .then((json: { success: boolean; data: Offer[] }) => {
        if (json.success) {
          setAvailableCodes(json.data.filter((o) => !!o.code));
        }
      })
      .catch(() => {});
  }, []);

  const deliveryCost = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
  const needed       = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progress     = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  const discount = promoInfo
    ? promoInfo.discountType === "percentage"
      ? subtotal * (promoInfo.discountValue / 100)
      : promoInfo.discountType === "fixed"
      ? Math.min(promoInfo.discountValue, subtotal)
      : deliveryCost
    : 0;

  const effectiveDelivery = promoInfo?.discountType === "freeDelivery" ? 0 : deliveryCost;
  const total = subtotal + effectiveDelivery - (promoInfo?.discountType === "freeDelivery" ? 0 : discount);

  async function applyPromo(e?: React.FormEvent) {
    e?.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    try {
      const res  = await fetch("/api/offers/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code, subtotal }),
      });
      const json = await res.json() as { success: boolean; data?: { code: string; label: string; discountType: string; discountValue: number; minOrderValue: number }; error?: string };
      if (json.success && json.data) {
        setPromoCode(json.data.code ?? code);
        setPromoInfo({
          label:         json.data.label,
          discountType:  json.data.discountType as "percentage" | "fixed" | "freeDelivery",
          discountValue: json.data.discountValue,
          minOrderValue: json.data.minOrderValue,
        });
        toast.success(`${json.data.code ?? code} applied — ${json.data.label}`);
      } else {
        toast.error(json.error ?? "Invalid promo code");
      }
    } catch {
      toast.error("Could not validate promo code. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  function removePromo() {
    setPromoCode(null);
    setPromoInfo(null);
    setPromoInput("");
    toast.success("Promo code removed");
  }

  function handleChipClick(code: string) {
    setPromoInput(code);
    void applyChipCode(code);
  }

  async function applyChipCode(code: string) {
    setApplying(true);
    try {
      const res  = await fetch("/api/offers/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code, subtotal }),
      });
      const json = await res.json() as { success: boolean; data?: { code: string; label: string; discountType: string; discountValue: number; minOrderValue: number }; error?: string };
      if (json.success && json.data) {
        setPromoCode(json.data.code ?? code);
        setPromoInfo({
          label:         json.data.label,
          discountType:  json.data.discountType as "percentage" | "fixed" | "freeDelivery",
          discountValue: json.data.discountValue,
          minOrderValue: json.data.minOrderValue,
        });
        toast.success(`${json.data.code ?? code} applied — ${json.data.label}`);
      } else {
        toast.error(json.error ?? "This code cannot be applied to your cart");
      }
    } catch {
      toast.error("Could not validate promo code. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5 sticky top-20">
      <h2 className="text-base font-black text-gray-900 dark:text-white">Order Summary</h2>

      {/* Line items */}
      <ul className="space-y-2.5 text-sm">
        <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
        <SummaryRow
          label="Delivery"
          value={effectiveDelivery === 0 ? "Free" : formatPrice(effectiveDelivery)}
          valueClassName={effectiveDelivery === 0 ? "text-green-600 font-semibold" : ""}
        />
        {promoInfo && discount > 0 && (
          <SummaryRow
            label={`${promoCode} discount`}
            value={`–${formatPrice(discount)}`}
            valueClassName="text-green-600 font-semibold"
          />
        )}
        {promoInfo?.discountType === "freeDelivery" && (
          <SummaryRow
            label={`${promoCode} — free delivery`}
            value="–£3.99"
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
        <div className={cn("text-xs font-medium", needed === 0 ? "text-green-600" : "text-[#00539F]")}>
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

        {promoInfo ? (
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-green-600" />
              <div>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">{promoCode}</span>
                <span className="ml-2 text-xs text-green-600 dark:text-green-500">{promoInfo.label}</span>
              </div>
            </div>
            <button onClick={removePromo} aria-label="Remove promo code" className="text-green-500 hover:text-red-500 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <form onSubmit={applyPromo} className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                aria-label="Promo code"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 uppercase focus:outline-none focus:border-[#00539F] focus:ring-1 focus:ring-[#00539F]"
              />
              <button
                type="submit"
                disabled={applying || !promoInput.trim()}
                className="px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Apply
              </button>
            </form>

            {/* Available promo chips */}
            {availableCodes.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">Available codes — click to apply:</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableCodes.map((offer) => (
                    <button
                      key={offer._id}
                      type="button"
                      onClick={() => handleChipClick(offer.code!)}
                      disabled={applying}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-[11px] font-semibold text-[#00539F] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {offer.code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
