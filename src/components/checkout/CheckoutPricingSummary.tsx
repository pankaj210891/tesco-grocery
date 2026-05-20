"use client";

import { useState, useEffect } from "react";
import { Tag, X, Loader2, CreditCard, Truck, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_COST, COD_CHARGE } from "@/lib/constants/promos";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { apiClient } from "@/lib/axios";
import type { EligiblePromo } from "@/services/promo.service";
import type { PaymentMethodType } from "@/types";
import { EligiblePromoCard, type ApplyData } from "@/components/checkout/EligiblePromoCard";

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

export default function CheckoutPricingSummary({
  subtotal, isSubmitting, paymentMethod,
}: Props) {
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

  const itemsKey   = items.map((i) => `${i.product._id}:${i.quantity}`).join(",");
  const promoItems = items.map((i) => ({
    productId: i.product._id,
    category:  i.product.category,
    price:     i.product.price,
    quantity:  i.quantity,
  }));

  // Fetch eligible promos whenever cart changes
  useEffect(() => {
    let cancelled = false;
    apiClient
      .post<{ success: boolean; data: EligiblePromo[] }>("/api/offers/eligible", {
        userId: user?._id,
        items:  promoItems,
        subtotal,
      })
      .then(({ data: json }) => {
        if (!cancelled) setEligiblePromos(json.success ? json.data : []);
      })
      .catch(() => { if (!cancelled) setEligiblePromos([]); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, subtotal]);

  // Re-validate applied promo whenever cart changes
  useEffect(() => {
    if (!promoCode || items.length === 0) return;
    let cancelled = false;
    apiClient
      .post<{ success: boolean; data?: ApplyData; error?: string }>("/api/offers/apply", {
        code:    promoCode,
        userId:  user?._id,
        items:   promoItems,
        subtotal,
      })
      .then(({ data: json }) => {
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

  // Pricing — discountAmount is always server-calculated
  const deliveryCost      = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
  const effectiveDelivery = promoInfo?.discountType === "freeDelivery" ? 0 : deliveryCost;
  const codCharge         = paymentMethod === "cod" ? COD_CHARGE : 0;
  const discountAmount    = promoInfo?.discountAmount ?? 0;
  const total             = promoInfo
    ? promoInfo.discountType === "freeDelivery"
      ? subtotal + codCharge
      : Math.max(0, subtotal + deliveryCost + codCharge - discountAmount)
    : subtotal + deliveryCost + codCharge;

  async function applyCode(code: string) {
    const upper = code.trim().toUpperCase();
    if (!upper) return;
    setApplying(true);
    try {
      const { data: json } = await apiClient.post<{ success: boolean; data?: ApplyData; error?: string }>(
        "/api/offers/apply",
        { code: upper, userId: user?._id, items: promoItems, subtotal }
      );
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

  const pmConfig = paymentMethod ? PM_LABELS[paymentMethod] : null;

  return (
    <div className="space-y-4">

      {/* Promo code — identical to cart OrderSummary */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Promo Code
        </p>

        {promoInfo ? (
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
          <div className="space-y-3">
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

            {eligiblePromos.length > 0 && (
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
            )}
          </div>
        )}
      </div>

      {/* Price breakdown */}
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        <Row
          label="Delivery"
          value={effectiveDelivery === 0 ? "Free" : formatPrice(effectiveDelivery)}
          className={effectiveDelivery === 0 ? "text-green-600" : ""}
        />
        {codCharge > 0 && (
          <Row label="COD charge" value={formatPrice(codCharge)} className="text-amber-600 dark:text-amber-400" />
        )}
        {promoInfo && discountAmount > 0 && (
          <Row label={`${promoCode} discount`} value={`–${formatPrice(discountAmount)}`} className="text-green-600" />
        )}
        {promoInfo?.discountType === "freeDelivery" && (
          <Row label={`${promoCode} — free delivery`} value={`–${formatPrice(deliveryCost)}`} className="text-green-600" />
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
        className="w-full py-3 bg-[#FCA311] hover:bg-[#E8920A] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
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
          Pay in cash when your order arrives. ₹{COD_CHARGE} COD charge applies.
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

