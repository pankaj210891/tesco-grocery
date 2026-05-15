import { formatPrice } from "@/lib/utils/format";
import type { EligiblePromo } from "@/services/promo.service";

export interface ApplyData {
  code:           string;
  label:          string;
  discountType:   "percentage" | "fixed" | "freeDelivery";
  discountValue:  number;
  discountAmount: number;
  minOrderValue:  number;
}

export function EligiblePromoCard({
  promo, applying, onApply,
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
