"use client";

import { cn } from "@/lib/utils/cn";
import type { ProductVariant } from "@/types";

interface VariantSelectorProps {
  variants:  ProductVariant[];
  selected:  ProductVariant | null;
  onSelect:  (v: ProductVariant) => void;
}

export default function VariantSelector({ variants, selected, onSelect }: VariantSelectorProps) {
  if (!variants.length) return null;

  return (
    <div data-testid="variant-selector">
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
        Option
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const isSelected = selected?._id === v._id;
          return (
            <button
              key={v._id}
              type="button"
              data-testid={`variant-option-${v._id}`}
              onClick={() => onSelect(v)}
              disabled={!v.inStock}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors",
                isSelected
                  ? "border-[#1a7a4a] bg-[#1a7a4a] text-white"
                  : v.inStock
                    ? "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-[#1a7a4a] hover:text-[#1a7a4a] bg-white dark:bg-gray-800"
                    : "border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed line-through",
              )}
            >
              {v.label}
              {!v.inStock && (
                <span className="ml-1 text-[10px] font-normal">(out)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
