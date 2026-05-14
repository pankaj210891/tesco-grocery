"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Star, Plus, Minus, ShoppingCart, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { savePendingAction } from "@/lib/pending-action";
import WishlistButton from "./WishlistButton";
import type { Product } from "@/types";

const AMBER = "#FCA311";
const AMBER_DARK = "#E8920A";

const BADGE_MAP: Record<string, string> = {
  NEW:       "bg-blue-500",
  HOT:       "bg-red-500",
  LIMITED:   "bg-orange-500",
  ORGANIC:   "bg-green-600",
  EXCLUSIVE: "bg-purple-600",
};

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
                ? "fill-[#FCA311] text-[#FCA311]"
                : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600",
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">({count})</span>
    </div>
  );
}

const CARD_SLIDE_MS = 4000;

function CardCarousel({ images, alt, href }: { images: string[]; alt: string; href: string }) {
  const [idx,     setIdx]     = useState(0);
  const [hovered, setHovered] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback((dir: 1 | -1, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIdx((i) => (i + dir + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || hovered) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % count), CARD_SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx, hovered, count]);

  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0]?.clientX ?? null; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStart.current = null;
  }

  const src = images[idx] ?? "/images/placeholder-product.png";

  return (
    <Link
      href={href}
      className="block relative h-44 overflow-hidden bg-gray-50 dark:bg-gray-700/30"
      tabIndex={-1}
      aria-hidden
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Image
        key={src}
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
      />

      {count > 1 && (
        <>
          <button
            onClick={(e) => go(-1, e)}
            aria-label="Previous image"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/90 dark:bg-gray-900/90 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-gray-700 dark:text-gray-200" />
          </button>
          <button
            onClick={(e) => go(1, e)}
            aria-label="Next image"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/90 dark:bg-gray-900/90 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-3.5 w-3.5 text-gray-700 dark:text-gray-200" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === idx ? "w-3 h-1 bg-[#FCA311]" : "w-1 h-1 bg-white/70",
                )}
              />
            ))}
          </div>
        </>
      )}
    </Link>
  );
}

interface ProductCardProps {
  product:    Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCartStore();
  const { token } = useAuthStore();
  const router    = useRouter();
  const pathname  = usePathname();

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
        "shadow-sm hover:shadow-lg hover:-translate-y-0.5",
        "transition-all duration-300 flex flex-col overflow-hidden",
        className,
      )}
    >
      {/* Sale / badge row — top left */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
        {discount && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#25A244] text-white uppercase tracking-wide">
            Sale
          </span>
        )}
        {product.badge && (
          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded text-white uppercase tracking-wide", BADGE_MAP[product.badge] ?? "bg-gray-500")}>
            {product.badge}
          </span>
        )}
        {!product.inStock && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-gray-400 text-white uppercase">
            Out of Stock
          </span>
        )}
      </div>

      {/* Wishlist — top right */}
      <WishlistButton product={product} className="absolute top-2.5 right-2.5 z-10" />

      {/* Image */}
      <CardCarousel
        images={product.images.length > 0 ? product.images : ["/images/placeholder-product.png"]}
        alt={product.name}
        href={`/products/${product.slug}`}
      />

      {/* Body */}
      <div className="flex flex-col flex-1 p-3.5 gap-1.5">

        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 truncate">
          {product.category}
        </p>

        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-[#FCA311] transition-colors leading-snug"
        >
          {product.name}
        </Link>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{product.brand}</p>

        <StarRating rating={product.rating} count={product.reviewCount} />

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1.5">
          <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            ₹{product.price.toFixed(0)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
              ₹{product.originalPrice.toFixed(0)}
            </span>
          )}
          {discount && (
            <span className="ml-auto text-[10px] font-bold text-[#25A244] dark:text-green-400">
              {discount}% off
            </span>
          )}
        </div>

        {product.unit && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-0.5">{product.unit}</p>
        )}

        {/* Cart control */}
        {product.inStock ? (
          qty === 0 ? (
            <button
              onClick={() => requireAuth(1, (t) => void addItem(product, 1, t))}
              className="mt-2 w-full h-10 flex items-center justify-center gap-2 text-white text-sm font-bold rounded-xl transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md"
              style={{ backgroundColor: AMBER }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER_DARK; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER; }}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              Add to Cart
            </button>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1.5">
              <button
                onClick={() => requireAuth(qty - 1, (t) => void updateQuantity(product._id, qty - 1, t))}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 shadow-sm hover:border-[#FCA311] active:scale-90 transition-all"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums w-6 text-center">
                {qty}
              </span>
              <button
                onClick={() => requireAuth(qty + 1, (t) => void updateQuantity(product._id, qty + 1, t))}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-white shadow-sm active:scale-90 transition-all"
                style={{ backgroundColor: AMBER }}
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
