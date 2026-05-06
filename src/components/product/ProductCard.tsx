"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Plus, Minus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Badge from "@/components/ui/Badge";
import { useCartStore } from "@/store/cart.store";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCartStore();

  const cartItem = items.find((i) => i.product._id === product._id);
  const qty = cartItem?.quantity ?? 0;

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100
        )
      : null;

  return (
    <article
      className={cn(
        "group relative bg-white rounded-xl border border-gray-100 shadow-sm",
        "hover:shadow-md transition-shadow flex flex-col",
        className
      )}
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {discount && <Badge variant="sale" label={`${discount}% off`} />}
        {!product.inStock && <Badge variant="outOfStock" />}
      </div>

      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className="block relative h-44 rounded-t-xl overflow-hidden bg-gray-50"
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={product.images[0] ?? "/images/placeholder-product.png"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
        />
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {product.category}
        </p>

        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-[#00539F] transition-colors leading-snug"
        >
          {product.name}
        </Link>

        <p className="text-xs text-gray-500">{product.brand}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-0.5">
          <div className="flex" aria-label={`Rating: ${product.rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3 w-3",
                  i < Math.floor(product.rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-gray-200 text-gray-200"
                )}
              />
            ))}
          </div>
          <span className="text-[11px] text-gray-400">({product.reviewCount})</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-auto pt-1.5">
          <span className="text-lg font-black text-gray-900">
            £{product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">
              £{product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400">{product.unit}</p>

        {/* Cart control */}
        {product.inStock ? (
          qty === 0 ? (
            <button
              onClick={() => addItem(product)}
              className={cn(
                "mt-2 w-full h-9 flex items-center justify-center gap-1.5",
                "bg-[#00539F] text-white text-sm font-semibold rounded-lg",
                "hover:bg-[#003B7A] active:scale-95 transition-all"
              )}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart className="h-4 w-4" />
              Add
            </button>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => updateQuantity(product._id, qty - 1)}
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-lg",
                  "bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
                )}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4 text-gray-700" />
              </button>
              <span className="text-sm font-bold text-gray-900 tabular-nums w-6 text-center">
                {qty}
              </span>
              <button
                onClick={() => updateQuantity(product._id, qty + 1)}
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-lg",
                  "bg-[#00539F] text-white hover:bg-[#003B7A] active:scale-95 transition-all"
                )}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )
        ) : (
          <button
            disabled
            className="mt-2 w-full h-9 bg-gray-100 text-gray-400 text-sm font-semibold rounded-lg cursor-not-allowed"
          >
            Out of Stock
          </button>
        )}
      </div>
    </article>
  );
}
