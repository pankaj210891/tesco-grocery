"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { formatPrice } from "@/lib/utils/format";
import type { CartItem as CartItemType } from "@/types";

interface CartItemProps {
  item: CartItemType;
}

const AMBER = "#FCA311";
const AMBER_DARK = "#E8920A";

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const token = useAuthStore((s) => s.token) ?? "";
  const { product, quantity } = item;

  function handleQtyChange(newQty: number) {
    if (newQty <= 0) {
      handleRemove();
    } else {
      void updateQuantity(product._id, newQty, token);
    }
  }

  function handleRemove() {
    void removeItem(product._id, token);
    toast.success(`${product.name} removed from cart`);
  }

  const lineTotal = product.price * quantity;
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <article className="group flex gap-4 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* ── Product Image ── */}
      <Link
        href={`/products/${product.slug}`}
        className="shrink-0 relative rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 hover:opacity-90 transition-opacity"
        style={{ width: 96, height: 96 }}
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={product.images[0] ?? "/images/placeholder-product.png"}
          alt={product.name}
          fill
          sizes="96px"
          className="object-contain p-2"
        />
        {discount && (
          <span className="absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 bg-[#25A244] text-white rounded-md leading-none">
            -{discount}%
          </span>
        )}
      </Link>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Top row: name + remove */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${product.slug}`}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-[#FCA311] dark:hover:text-amber-400 transition-colors line-clamp-2 leading-snug"
            >
              {product.name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              {product.brand && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{product.brand}</p>
              )}
              {product.unit && (
                <p className="text-xs text-gray-400 dark:text-gray-500">· {product.unit}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleRemove}
            aria-label={`Remove ${product.name}`}
            className="shrink-0 p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom row: qty + price */}
        <div className="flex items-center justify-between gap-3 mt-auto">
          {/* Quantity stepper */}
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden h-8">
            <button
              onClick={() => handleQtyChange(quantity - 1)}
              aria-label="Decrease quantity"
              className="w-8 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-r border-gray-200 dark:border-gray-600 disabled:opacity-40"
              disabled={quantity <= 1}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 h-full flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white tabular-nums bg-white dark:bg-gray-800 select-none">
              {quantity}
            </span>
            <button
              onClick={() => handleQtyChange(quantity + 1)}
              aria-label="Increase quantity"
              className="w-8 h-full flex items-center justify-center transition-colors border-l border-gray-200 dark:border-gray-600 text-white"
              style={{ backgroundColor: AMBER }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER_DARK; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER; }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="font-black text-gray-900 dark:text-white text-base tracking-tight">
              {formatPrice(lineTotal)}
            </p>
            {quantity > 1 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {formatPrice(product.price)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
