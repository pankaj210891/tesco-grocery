"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Star, Plus, Minus, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { savePendingAction } from "@/lib/pending-action";
import WishlistButton from "./WishlistButton";
import type { Product } from "@/types";

const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  NEW:      { bg: "bg-blue-500",    text: "text-white" },
  HOT:      { bg: "bg-red-500",     text: "text-white" },
  LIMITED:  { bg: "bg-orange-500",  text: "text-white" },
  ORGANIC:  { bg: "bg-green-600",   text: "text-white" },
  EXCLUSIVE:{ bg: "bg-purple-600",  text: "text-white" },
};

function CustomBadge({ badge }: { badge: string }) {
  const style = BADGE_STYLES[badge] ?? { bg: "bg-gray-500", text: "text-white" };
  return (
    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full tracking-wide", style.bg, style.text)}>
      {badge}
    </span>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex" aria-label={`Rating: ${rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3 w-3",
              i < Math.floor(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600",
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">({count})</span>
    </div>
  );
}

interface ProductCardProps {
  product:    Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCartStore();
  const { token }  = useAuthStore();
  const router     = useRouter();
  const pathname   = usePathname();

  const cartItem = items.find((i) => i.product._id === product._id);
  const qty      = cartItem?.quantity ?? 0;

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  function requireAuth(quantity: number, action: (token: string) => void) {
    if (!token) {
      savePendingAction({ type: "addToCart", product, quantity });
      toast.info("Sign in to add items to your cart");
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    action(token);
  }

  return (
    <article
      className={cn(
        "group relative bg-white dark:bg-gray-800 rounded-2xl",
        "border border-gray-100 dark:border-gray-700/70",
        "shadow-sm hover:shadow-xl hover:-translate-y-0.5",
        "transition-all duration-300 flex flex-col overflow-hidden",
        className,
      )}
    >
      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
        {product.badge && <CustomBadge badge={product.badge} />}
        {discount && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">
            {discount}% OFF
          </span>
        )}
        {!product.inStock && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-500 text-white">
            OUT OF STOCK
          </span>
        )}
      </div>

      {/* Wishlist */}
      <WishlistButton product={product} className="absolute top-2.5 right-2.5 z-10" />

      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className="block relative h-44 rounded-t-2xl overflow-hidden bg-gray-50 dark:bg-gray-700/50"
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={product.images[0] ?? "/images/placeholder-product.png"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-4 group-hover:scale-108 transition-transform duration-500"
          style={{ transform: "scale(1)" }}
        />
        {/* Hover shimmer */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3.5 gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {product.category}
        </p>

        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-[#00539F] dark:hover:text-blue-400 transition-colors leading-snug"
        >
          {product.name}
        </Link>

        <p className="text-[11px] text-gray-400 dark:text-gray-500">{product.brand}</p>

        <StarRating rating={product.rating} count={product.reviewCount} />

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            ₹{product.price.toFixed(0)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
              ₹{product.originalPrice.toFixed(0)}
            </span>
          )}
          {discount && (
            <span className="text-xs font-bold text-green-600 dark:text-green-400 ml-auto">
              Save ₹{(product.originalPrice! - product.price).toFixed(0)}
            </span>
          )}
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-0.5">{product.unit}</p>

        {/* Cart control */}
        {product.inStock ? (
          qty === 0 ? (
            <button
              onClick={() => requireAuth(1, (t) => void addItem(product, 1, t))}
              className={cn(
                "mt-2 w-full h-10 flex items-center justify-center gap-2",
                "bg-[#00539F] text-white text-sm font-bold rounded-xl",
                "hover:bg-[#003B7A] active:scale-95 transition-all duration-200",
                "shadow-sm hover:shadow-md",
              )}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              Add to cart
            </button>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1">
              <button
                onClick={() => requireAuth(qty - 1, (t) => void updateQuantity(product._id, qty - 1, t))}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-600 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-500 active:scale-90 transition-all"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums w-6 text-center">
                {qty}
              </span>
              <button
                onClick={() => requireAuth(qty + 1, (t) => void updateQuantity(product._id, qty + 1, t))}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#00539F] text-white shadow-sm hover:bg-[#003B7A] active:scale-90 transition-all"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        ) : (
          <button
            disabled
            className="mt-2 w-full h-10 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-semibold rounded-xl cursor-not-allowed"
          >
            <Zap className="h-4 w-4" aria-hidden />
            Out of Stock
          </button>
        )}
      </div>
    </article>
  );
}
