"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tag, X, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from "@/lib/constants/promos";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import type { EligiblePromo } from "@/services/promo.service";

interface OrderSummaryProps {
  subtotal: number;
}

interface ApplyData {
  code:           string;
  label:          string;
  discountType:   "percentage" | "fixed" | "freeDelivery";
  discountValue:  number;
  discountAmount: number;
  minOrderValue:  number;
}

export default function OrderSummary({ subtotal }: OrderSummaryProps) {
  const items        = useCartStore((s) => s.items);
  const promoCode    = useCartStore((s) => s.promoCode);
  const promoInfo    = useCartStore((s) => s.promoInfo);
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const setPromoInfo = useCartStore((s) => s.setPromoInfo);
  const clearPromo   = useCartStore((s) => s.clearPromo);
  const { user }     = useAuthStore();

  const [promoInput,     setPromoInput]     = useState(promoCode ?? "");
  const [applying,       setApplying]       = useState(false);
  const [eligiblePromos, setEligiblePromos] = useState<EligiblePromo[]>([]);
  const [showOffers,     setShowOffers]     = useState(true);

  // Stable key — only changes when cart contents actually change
  const itemsKey = items.map((i) => `${i.product._id}:${i.quantity}`).join(",");

  // Cart items mapped to the shape the promo API expects
  const promoItems = items.map((i) => ({
    productId: i.product._id,
    category:  i.product.category,
    price:     i.product.price,
    quantity:  i.quantity,
  }));

  // ── Fetch eligible promos whenever cart changes ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    fetch("/api/offers/eligible", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: user?._id, items: promoItems, subtotal }),
    })
      .then((r) => r.json())
      .then((json: { success: boolean; data: EligiblePromo[] }) => {
        if (!cancelled) setEligiblePromos(json.success ? json.data : []);
      })
      .catch(() => { if (!cancelled) setEligiblePromos([]); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, subtotal]);

  // ── Re-validate applied promo whenever cart changes ───────────────────────
  useEffect(() => {
    if (!promoCode || items.length === 0) return;
    let cancelled = false;

    fetch("/api/offers/apply", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code: promoCode, userId: user?._id, items: promoItems, subtotal }),
    })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: ApplyData; error?: string }) => {
        if (cancelled) return;
        if (!json.success || !json.data) {
          clearPromo();
          toast.error(json.error ?? "Your promo code no longer applies to this cart");
        } else {
          setPromoInfo({
            label:          json.data.label,
            discountType:   json.data.discountType,
            discountValue:  json.data.discountValue,
            discountAmount: json.data.discountAmount,
            minOrderValue:  json.data.minOrderValue,
          });
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, subtotal]);

  // ── Pricing (discountAmount is always backend-calculated) ─────────────────
  const deliveryCost      = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
  const effectiveDelivery = promoInfo?.discountType === "freeDelivery" ? 0 : deliveryCost;
  const discountAmount    = promoInfo?.discountAmount ?? 0;
  const total             = promoInfo
    ? promoInfo.discountType === "freeDelivery"
      ? subtotal
      : Math.max(0, subtotal + deliveryCost - discountAmount)
    : subtotal + deliveryCost;

  const needed   = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  // ── Apply handler ─────────────────────────────────────────────────────────
  async function applyCode(code: string) {
    const upper = code.trim().toUpperCase();
    if (!upper) return;
    setApplying(true);
    try {
      const res  = await fetch("/api/offers/apply", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: upper, userId: user?._id, items: promoItems, subtotal }),
      });
      const json = await res.json() as { success: boolean; data?: ApplyData; error?: string };
      if (json.success && json.data) {
        setPromoCode(json.data.code);
        setPromoInfo({
          label:          json.data.label,
          discountType:   json.data.discountType,
          discountValue:  json.data.discountValue,
          discountAmount: json.data.discountAmount,
          minOrderValue:  json.data.minOrderValue,
        });
        toast.success(`${json.data.code} applied — you save ${formatPrice(json.data.discountAmount)}`);
        setPromoInput("");
      } else {
        toast.error(json.error ?? "Invalid promo code");
      }
    } catch {
      toast.error("Could not apply promo code. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  function removePromo() {
    clearPromo();
    setPromoInput("");
    toast.success("Promo code removed");
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5 sticky top-20">
      <h2 className="text-base font-black text-gray-900 dark:text-white">Order Summary</h2>

      {/* Price breakdown */}
      <ul className="space-y-2.5 text-sm">
        <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
        <SummaryRow
          label="Delivery"
          value={effectiveDelivery === 0 ? "Free" : formatPrice(effectiveDelivery)}
          valueClassName={effectiveDelivery === 0 ? "text-green-600 font-semibold" : ""}
        />
        {promoInfo && (
          <SummaryRow
            label={`${promoCode} saving`}
            value={`–${formatPrice(discountAmount)}`}
            valueClassName="text-green-600 font-semibold"
          />
        )}
      </ul>

      {/* Total */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-baseline justify-between">
        <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
        <span className="text-2xl font-black text-gray-900 dark:text-white">{formatPrice(total)}</span>
      </div>

      {/* Free-delivery progress bar */}
      <div className="space-y-1.5">
        <p className={cn("text-xs font-medium", needed === 0 ? "text-green-600" : "text-[#FCA311]")}>
          {needed === 0
            ? "You qualify for free delivery! 🎉"
            : `Add ${formatPrice(needed)} more for free delivery`}
        </p>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FCA311] rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* ── Promo code section ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Promo Code
        </p>

        {promoInfo ? (
          /* Applied — success state */
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="text-sm font-bold text-green-700 dark:text-green-400">{promoCode}</span>
              </div>
              <button
                onClick={removePromo}
                aria-label="Remove promo code"
                className="text-green-500 hover:text-red-500 transition-colors p-1 -mr-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-green-600 dark:text-green-500 pl-[22px]">{promoInfo.label}</p>
            <p className="text-xs font-bold text-green-700 dark:text-green-400 pl-[22px]">
              You save {formatPrice(discountAmount)}
            </p>
          </div>
        ) : (
          /* Not applied — input + eligible promo cards */
          <div className="space-y-3">
            {/* Manual entry */}
            <form
              onSubmit={(e) => { e.preventDefault(); void applyCode(promoInput); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                aria-label="Promo code"
                disabled={applying}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-base md:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:normal-case placeholder:text-gray-400 uppercase focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={applying || !promoInput.trim()}
                className="shrink-0 px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Apply
              </button>
            </form>

            {/* Eligible promos */}
            {eligiblePromos.length > 0 ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowOffers((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#FCA311] dark:text-amber-400 hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  {eligiblePromos.length} offer{eligiblePromos.length !== 1 ? "s" : ""} available for your cart
                  {showOffers ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {showOffers && (
                  <div className="space-y-2">
                    {eligiblePromos.map((promo) => (
                      <EligiblePromoCard
                        key={promo._id}
                        promo={promo}
                        applying={applying}
                        onApply={() => void applyCode(promo.code)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Checkout CTA */}
      <Link
        href="/checkout"
        className="block w-full text-center py-3.5 rounded-xl font-bold text-base bg-[#FCA311] text-white hover:bg-[#E8920A] transition-all active:scale-[0.98] shadow-sm"
      >
        Proceed to Checkout →
      </Link>
      <Link
        href="/products"
        className="block text-center text-sm text-[#FCA311] hover:underline font-medium"
      >
        ← Continue Shopping
      </Link>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      <span className={cn("font-medium text-gray-900 dark:text-white", valueClassName)}>{value}</span>
    </li>
  );
}

function EligiblePromoCard({
  promo,
  applying,
  onApply,
}: {
  promo:    EligiblePromo;
  applying: boolean;
  onApply:  () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {promo.emoji && <span className="text-sm leading-none">{promo.emoji}</span>}
          <span className="text-xs font-bold text-gray-900 dark:text-white tracking-wide">
            {promo.code}
          </span>
          {promo.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full leading-none">
              {promo.badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{promo.title}</p>
        {promo.eligibleCategories.length > 0 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate">
            Valid for: {promo.eligibleCategories.map((c) => c.replace(/-/g, " ")).join(", ")}
          </p>
        )}
        <p className="text-[11px] font-semibold text-green-600 dark:text-green-400">
          Save {formatPrice(promo.discountAmount)}
        </p>
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={applying}
        className="shrink-0 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#FCA311] text-white hover:bg-[#E8920A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Apply
      </button>
    </div>
  );
}
