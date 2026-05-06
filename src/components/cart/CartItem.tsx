"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cart.store";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CartItem as CartItemType } from "@/types";

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const { product, quantity } = item;

  function handleQtyChange(newQty: number) {
    if (newQty <= 0) {
      handleRemove();
    } else {
      updateQuantity(product._id, newQty);
    }
  }

  function handleRemove() {
    removeItem(product._id);
    toast.success(`${product.name} removed from cart`, {
      icon: "🗑️",
      duration: 2000,
    });
  }

  const lineTotal = product.price * quantity;

  return (
    <article className="flex gap-3 sm:gap-4 bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm">
      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className="shrink-0 relative h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 hover:opacity-90 transition-opacity"
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
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {/* Name + meta */}
          <div className="min-w-0">
            <Link
              href={`/products/${product.slug}`}
              className="font-semibold text-sm text-gray-900 hover:text-[#00539F] transition-colors line-clamp-2 leading-snug"
            >
              {product.name}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
            <p className="text-xs text-gray-400">{product.unit}</p>
          </div>

          {/* Remove */}
          <button
            onClick={handleRemove}
            aria-label={`Remove ${product.name} from cart`}
            className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom row: qty controls + price */}
        <div className="flex items-center justify-between mt-3 gap-2">
          {/* Qty stepper */}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => handleQtyChange(quantity - 1)}
              aria-label="Decrease quantity"
              className={cn(
                "px-2.5 py-1.5 transition-colors",
                quantity <= 1
                  ? "text-gray-300 cursor-default"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 py-1.5 text-sm font-bold tabular-nums min-w-[2.5rem] text-center border-x border-gray-200">
              {quantity}
            </span>
            <button
              onClick={() => handleQtyChange(quantity + 1)}
              aria-label="Increase quantity"
              className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="font-black text-gray-900 text-base">
              {formatPrice(lineTotal)}
            </p>
            {quantity > 1 && (
              <p className="text-xs text-gray-400">
                {formatPrice(product.price)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
