"use client";

import { memo, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, Bookmark, Truck, Zap, Store, AlertCircle, Tag } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CartItem as CartItemType, DeliveryOption } from "@/types";

interface CartItemProps {
  item: CartItemType;
}

function DeliveryBadge({ options }: { options?: DeliveryOption[] }) {
  if (!options?.length) return null;
  if (options.includes("express")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md">
        <Zap className="h-2.5 w-2.5" />
        Express delivery
      </span>
    );
  }
  if (options.includes("collection")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md">
        <Store className="h-2.5 w-2.5" />
        Collection available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 px-1.5 py-0.5 rounded-md">
      <Truck className="h-2.5 w-2.5" />
      Standard delivery
    </span>
  );
}

const AMBER      = "#FCA311";
const AMBER_DARK = "#E8920A";

function CartItem({ item }: CartItemProps) {
  // Stable action selectors — Zustand actions never change, so these don't trigger re-renders
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem     = useCartStore((s) => s.removeItem);
  const saveForLater   = useCartStore((s) => s.saveForLater);
  const token          = useAuthStore((s) => s.token) ?? "";

  const { product, quantity, variantId = null, selectedVariant } = item;

  // Derived price/discount — memoized so they don't recalculate on unrelated re-renders
  const { effectivePrice, effectiveOriginalPrice, lineTotal, discount, isInStock } = useMemo(() => {
    const ep  = selectedVariant?.price        != null ? selectedVariant.price        : product.price;
    const eop = selectedVariant?.originalPrice != null ? selectedVariant.originalPrice : product.originalPrice;
    return {
      effectivePrice:         ep,
      effectiveOriginalPrice: eop,
      lineTotal:              ep * quantity,
      discount:               eop && eop > ep ? Math.round(((eop - ep) / eop) * 100) : null,
      isInStock:              selectedVariant != null ? selectedVariant.inStock : product.inStock,
    };
  }, [selectedVariant, product.price, product.originalPrice, product.inStock, quantity]);

  const handleRemove = useCallback(() => {
    void removeItem(product._id, variantId, token);
    const label = selectedVariant ? `${product.name} (${selectedVariant.label})` : product.name;
    toast.success(`${label} removed from cart`);
  }, [removeItem, product._id, variantId, token, selectedVariant, product.name]);

  const handleQtyChange = useCallback((newQty: number) => {
    if (newQty <= 0) {
      handleRemove();
    } else {
      void updateQuantity(product._id, variantId, newQty, token);
    }
  }, [handleRemove, updateQuantity, product._id, variantId, token]);

  const handleSaveForLater = useCallback(() => {
    if (!token) { toast.error("Sign in to save items"); return; }
    void saveForLater(product._id, variantId, token);
    const label = selectedVariant ? `${product.name} (${selectedVariant.label})` : product.name;
    toast.success(`${label} saved for later`);
  }, [saveForLater, product._id, variantId, token, selectedVariant, product.name]);

  return (
    <article
      data-testid="cart-item"
      className="group flex gap-4 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
    >
      {/* ── Product Image ── */}
      <Link
        href={`/products/${product.slug}`}
        className="shrink-0 relative rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 hover:opacity-90 transition-opacity"
        style={{ width: 96, height: 96 }}
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={product.images[0] ?? "/images/placeholder-product.webp"}
          alt={product.name}
          fill
          sizes="96px"
          className="object-contain p-2"
        />
        {discount && (
          <span className="absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 bg-red-500 text-white rounded-md leading-none">
            {discount}% off
          </span>
        )}
        {!isInStock && (
          <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center">
            <span className="text-[9px] font-black text-red-600 uppercase tracking-wide">Out of stock</span>
          </div>
        )}
      </Link>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Top row: name + remove */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${product.slug}`}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-[#FCA311] dark:hover:text-amber-400 transition-colors line-clamp-2 leading-snug"
            >
              {product.name}
            </Link>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              {product.brand && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{product.brand}</p>
              )}
              {product.unit && (
                <p className="text-xs text-gray-400 dark:text-gray-500">· {product.unit}</p>
              )}
              {product.vendorName && (
                <p className="text-xs text-[#FCA311] font-medium">· {product.vendorName}</p>
              )}
            </div>
            {/* Variant label */}
            {selectedVariant && (
              <div className="flex items-center gap-1 mt-1">
                <Tag className="h-3 w-3 text-gray-400 dark:text-gray-500 shrink-0" />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {selectedVariant.label}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleRemove}
            aria-label={`Remove ${product.name}`}
            className="shrink-0 p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Delivery & stock badges */}
        <div className="flex flex-wrap gap-1.5">
          {!isInStock ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md">
              <AlertCircle className="h-2.5 w-2.5" />
              Out of stock
            </span>
          ) : (
            <DeliveryBadge options={product.deliveryOptions} />
          )}
        </div>

        {/* Price row — uses variant price when applicable */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {formatPrice(effectivePrice)}
          </span>
          {effectiveOriginalPrice && effectiveOriginalPrice > effectivePrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(effectiveOriginalPrice)}
            </span>
          )}
        </div>

        {/* Bottom row: qty + line total + save-for-later */}
        <div className="flex items-center justify-between gap-3 mt-auto">
          {/* Quantity stepper */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden h-8">
            <button
              onClick={() => handleQtyChange(quantity - 1)}
              aria-label="Decrease quantity"
              data-testid="qty-decrease"
              className={cn(
                "w-8 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors border-r border-gray-200 dark:border-gray-600",
                quantity <= 1
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
              disabled={quantity <= 1}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span
              data-testid="qty-value"
              className="w-10 h-full flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white tabular-nums bg-white dark:bg-gray-800 select-none"
            >
              {quantity}
            </span>
            <button
              onClick={() => handleQtyChange(quantity + 1)}
              aria-label="Increase quantity"
              data-testid="qty-increase"
              className="w-8 h-full flex items-center justify-center transition-colors border-l border-gray-200 dark:border-gray-600 text-white"
              style={{ backgroundColor: AMBER }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER_DARK; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER; }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Save for later */}
            <button
              onClick={handleSaveForLater}
              disabled={!token}
              aria-label={`Save ${product.name} for later`}
              data-testid="save-for-later"
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-[#FCA311] dark:hover:text-amber-400 transition-colors flex items-center gap-1 font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400"
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>

            {/* Line total */}
            <div className="text-right">
              <p className="font-black text-gray-900 dark:text-white text-base tracking-tight">
                {formatPrice(lineTotal)}
              </p>
              {quantity > 1 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatPrice(effectivePrice)} each
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(CartItem);
