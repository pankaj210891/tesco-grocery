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

  const effectivePrice         = selectedVariant?.price ?? product.price;
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
