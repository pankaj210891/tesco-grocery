"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils/format";
import VariantSelector from "./VariantSelector";
import ProductAddToCart from "./ProductAddToCart";
import type { Product, ProductVariant } from "@/types";

interface ProductVariantSectionProps {
  product: Product;
}

export default function ProductVariantSection({ product }: ProductVariantSectionProps) {
  const hasVariants = (product.variants?.length ?? 0) > 0;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    hasVariants ? (product.variants![0]) : null
  );

  // Prefer variant price; if null, fall back to product.price.
  // If product.price is also 0, scan other variants for the cheapest real price.
  const variantPriceOrNull = selectedVariant?.price ?? null;
  const fallbackPrice: number = (() => {
    if (product.price > 0) return product.price;
    const first = (product.variants ?? []).find((v) => v.price != null && v.price > 0);
    return first?.price ?? 0;
  })();
  const effectivePrice         = variantPriceOrNull != null && variantPriceOrNull > 0 ? variantPriceOrNull : fallbackPrice;
  const effectiveOriginalPrice = selectedVariant?.originalPrice ?? product.originalPrice;

  const discount =
    effectiveOriginalPrice && effectiveOriginalPrice > effectivePrice
      ? Math.round(((effectiveOriginalPrice - effectivePrice) / effectiveOriginalPrice) * 100)
      : null;

  return (
    <>
      {/* Variant selector */}
      {hasVariants && (
        <VariantSelector
          variants={product.variants!}
          selected={selectedVariant}
          onSelect={setSelectedVariant}
        />
      )}

      {/* Price card */}
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-4">
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
          Price
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tight"
            data-testid="effective-price"
          >
            {formatPrice(effectivePrice)}
          </span>
          {effectiveOriginalPrice && effectiveOriginalPrice > effectivePrice && (
            <>
              <span className="text-lg text-gray-400 dark:text-gray-500 line-through">
                {formatPrice(effectiveOriginalPrice)}
              </span>
              {discount && (
                <span className="text-sm font-bold text-[#25A244] dark:text-green-400">
                  Save {discount}%
                </span>
              )}
            </>
          )}
        </div>
        {product.unit && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{product.unit}</p>
        )}
      </div>

      {/* Add to cart */}
      <ProductAddToCart product={product} selectedVariant={selectedVariant} />
    </>
  );
}
