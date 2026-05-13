"use client";

import { useState, useEffect } from "react";
import { Tag, X, Loader2, CreditCard, Truck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from "@/lib/constants/promos";
import { useCartStore } from "@/store/cart.store";
import type { Offer, PaymentMethodType } from "@/types";

interface Props {
  subtotal:       number;
  isSubmitting:   boolean;
  postcode?:      string;
  paymentMethod?: PaymentMethodType;
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={cn("font-semibold text-gray-900 dark:text-white", className)}>{value}</span>
    </div>
  );
}

const PM_LABELS: Record<PaymentMethodType, { label: string; icon: React.ReactNode }> = {
  razorpay: { label: "Pay with Razorpay", icon: <CreditCard className="h-4 w-4" /> },
  cod:      { label: "Place COD Order",   icon: <Truck      className="h-4 w-4" /> },
};

export default function CheckoutPricingSummary({ subtotal, isSubmitting, paymentMethod }: Props) {
  const promoCode    = useCartStore((s) => s.promoCode);
  const promoInfo    = useCartStore((s) => s.promoInfo);
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const setPromoInfo = useCartStore((s) => s.setPromoInfo);

  const [input, setInput]             = useState(promoCode ?? "");
  const [applying, setApplying]       = useState(false);
  const [availableCodes, setAvailableCodes] = useState<Offer[]>([]);

  useEffect(() => {
    fetch("/api/offers")
      .then((r) => r.json())
      .then((json: { success: boolean; data: Offer[] }) => {
        if (json.success) setAvailableCodes(json.data.filter((o) => !!o.code));
      })
      .catch(() => {});
  }, []);

  const deliveryCost      = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
  const effectiveDelivery = promoInfo?.discountType === "freeDelivery" ? 0 : deliveryCost;

  const discount = promoInfo
    ? promoInfo.discountType === "percentage"
      ? subtotal * (promoInfo.discountValue / 100)
      : promoInfo.discountType === "fixed"
      ? Math.min(promoInfo.discountValue, subtotal)
      : deliveryCost
    : 0;

  const total = subtotal + effectiveDelivery - (promoInfo?.discountType === "freeDelivery" ? 0 : discount);

  async function validateAndApply(code: string) {
    if (!code.trim()) return;
    setApplying(true);
    try {
      const res  = await fetch("/api/offers/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: code.trim().toUpperCase(), subtotal }),
      });
      const json = await res.json() as {
        success: boolean;
        data?: { code: string; label: string; discountType: string; discountValue: number; discountAmount: number; minOrderValue: number };
        error?: string;
      };
      if (json.success && json.data) {
        setPromoCode(json.data.code ?? code);
        setPromoInfo({
          label:          json.data.label,
          discountType:   json.data.discountType as "percentage" | "fixed" | "freeDelivery",
          discountValue:  json.data.discountValue,
          discountAmount: json.data.discountAmount,
          minOrderValue:  json.data.minOrderValue,
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
    setInput("");
    toast.success("Promo code removed");
  }

  const pmConfig = paymentMethod ? PM_LABELS[paymentMethod] : null;

  return (
    <div className="space-y-4">
      {/* Promo code */}
      {promoInfo ? (
        <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span>{promoCode}</span>
            <span className="font-normal text-green-600 dark:text-green-500 text-xs">{promoInfo.label}</span>
          </div>
          <button onClick={removePromo} aria-label="Remove promo code">
            <X className="h-4 w-4 text-green-600 hover:text-green-800 dark:hover:text-green-300" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void validateAndApply(input); } }}
              placeholder="Promo code"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#00539F] focus:ring-2 focus:ring-blue-100 uppercase"
            />
            <button
              type="button"
              onClick={() => void validateAndApply(input)}
              disabled={applying || !input.trim()}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Apply
            </button>
          </div>

          {availableCodes.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">Available codes — click to apply:</p>
              <div className="flex flex-wrap gap-1.5">
                {availableCodes.map((offer) => (
                  <button
                    key={offer._id}
                    type="button"
                    onClick={() => { setInput(offer.code!); void validateAndApply(offer.code!); }}
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

      {/* Price breakdown */}
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        <Row
          label="Delivery"
          value={effectiveDelivery === 0 ? "Free" : formatPrice(effectiveDelivery)}
          className={effectiveDelivery === 0 ? "text-green-600" : ""}
        />
        {promoInfo && discount > 0 && (
          <Row
            label={`${promoCode} discount`}
            value={`–${formatPrice(discount)}`}
            className="text-green-600"
          />
        )}
        {promoInfo?.discountType === "freeDelivery" && (
          <Row label={`${promoCode} — free delivery`} value="–£3.99" className="text-green-600" />
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="font-black text-gray-900 dark:text-white">Total</span>
          <span className="text-xl font-black text-gray-900 dark:text-white">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Place order button */}
      <button
        type="submit"
        form="checkout-form"
        disabled={isSubmitting}
        className="w-full py-3 bg-[#00539F] hover:bg-[#003B7A] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : pmConfig ? (
          <>
            {pmConfig.icon}
            {pmConfig.label} · {formatPrice(total)}
          </>
        ) : (
          `Place order · ${formatPrice(total)}`
        )}
      </button>

      {paymentMethod === "razorpay" && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          You will be redirected to Razorpay to complete payment securely.
        </p>
      )}
      {paymentMethod === "cod" && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Pay in cash when your order arrives.
        </p>
      )}
      {!paymentMethod && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Select a payment method above to continue.
        </p>
      )}
    </div>
  );
}
