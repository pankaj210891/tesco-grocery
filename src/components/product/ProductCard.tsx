"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

import { Plus, Minus, ShoppingCart, Zap } from "lucide-react";
import NavArrow from "@/components/ui/NavArrow";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { savePendingAction } from "@/lib/pending-action";
import WishlistButton from "./WishlistButton";
import RatingStars from "./RatingStars";
import type { Product } from "@/types";

const AMBER = "#FCA311";
const AMBER_DARK = "#E8920A";

const BADGE_MAP: Record<string, { bg: string; text: string }> = {
  NEW:       { bg: "bg-blue-500",    text: "text-white" },
  HOT:       { bg: "bg-red-500",     text: "text-white" },
  LIMITED:   { bg: "bg-orange-500",  text: "text-white" },
  ORGANIC:   { bg: "bg-green-600",   text: "text-white" },
  EXCLUSIVE: { bg: "bg-purple-600",  text: "text-white" },
};

const SLIDE_MS = 4000;

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
    const t = setTimeout(() => setIdx((i) => (i + 1) % count), SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx, hovered, count]);

  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0]?.clientX ?? null; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStart.current = null;
  }

  const src = images[idx] ?? "/images/placeholder-product.webp";

  return (
    <Link
      href={href}
      className="block relative w-full aspect-square overflow-hidden bg-gray-50 dark:bg-gray-800/60"
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
        className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.06]"
      />

      {/* Nav arrows */}
      {count > 1 && (
        <>
          <NavArrow direction="prev" onClick={() => go(-1)} variant="amber" size="sm" label="Previous image" className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100" />
          <NavArrow direction="next" onClick={() => go(1)} variant="amber" size="sm" label="Next image" className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100" />
          {/* Dots */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-full transition-[width,background-color] duration-300",
                  i === idx ? "w-4 h-1.5 bg-[#FCA311]" : "w-1.5 h-1.5 bg-white/60 dark:bg-gray-400/60",
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

  const cartItem = items.find((i) => i.product._id === product._id);
  const qty      = cartItem?.quantity ?? 0;

  // When base price is 0 and variants exist, derive display price from cheapest variant
  const variantPrices = (product.variants ?? [])
    .map((v) => v.price)
    .filter((p): p is number => p != null && p > 0);
  const displayPrice =
    product.price === 0 && variantPrices.length > 0
      ? Math.min(...variantPrices)
      : product.price;
  const hasMultiplePrices =
    product.price === 0 && variantPrices.length > 1 &&
    new Set(variantPrices).size > 1;

  const discount =
    product.originalPrice && product.originalPrice > displayPrice
      ? Math.round(((product.originalPrice - displayPrice) / product.originalPrice) * 100)
      : null;

  function handleCartAction(quantity: number) {
    if (!token) {
      // Guest: add to local cart + save pending action for sync after login
      void addItem(product, quantity, null);
      savePendingAction({ type: "addToCart", product, quantity });
      toast.info("Added to cart — sign in to save & checkout");
      return;
    }
    void addItem(product, quantity, token);
  }

  function handleQuantityChange(newQty: number) {
    // ProductCard has no variant selector — use null variantId (base product slot)
    const variantId = cartItem?.variantId ?? null;
    if (!token) {
      void updateQuantity(product._id, variantId, newQty, null);
      return;
    }
    void updateQuantity(product._id, variantId, newQty, token);
  }


  const badge = product.badge ? BADGE_MAP[product.badge] : null;

  return (
    <article
      className={cn(
        "group relative bg-white dark:bg-gray-800/80 flex flex-col",
        "rounded-xl border border-gray-200 dark:border-gray-700/60",
        "hover:border-[#FCA311]/50 dark:hover:border-[#FCA311]/40",
        "hover:shadow-[0_4px_20px_rgba(252,163,17,0.12)] dark:hover:shadow-[0_4px_20px_rgba(252,163,17,0.08)]",
        "transition-colors transition-shadow duration-300 overflow-hidden",
        className,
      )}
    >
      {/* ── Badges ── */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
        {discount && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-500 text-white tracking-wide">
            {discount}% off
          </span>
        )}
        {badge && (
          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md tracking-wide", badge.bg, badge.text)}>
            {product.badge}
          </span>
        )}
        {!product.inStock && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gray-500 text-white">
            Out of stock
          </span>
        )}
      </div>

      {/* ── Wishlist ── */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <WishlistButton
          product={product}
          className="w-8 h-8 bg-white dark:bg-gray-700 shadow-md hover:scale-110"
        />
      </div>

      {/* ── Image ── */}
      <CardCarousel
        images={product.images.length > 0 ? product.images : ["/images/placeholder-product.webp"]}
        alt={product.name}
        href={`/products/${product.slug}`}
      />

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-3.5 pt-3 gap-2">

        {/* Category */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 truncate">
          {product.category}
        </p>

        {/* Name */}
        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1 hover:text-[#FCA311] dark:hover:text-amber-400 transition-colors leading-snug"
        >
          {product.name}
        </Link>

        {/* Brand + Rating */}
        <div className="flex items-center justify-between gap-1">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{product.brand}</p>
        </div>

        <RatingStars rating={product.rating} reviewCount={product.reviewCount} size="sm" showScore={false} />

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
            {hasMultiplePrices && (
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mr-0.5">From </span>
            )}
            ₹{displayPrice.toFixed(0)}
          </span>
          {product.originalPrice && product.originalPrice > displayPrice && (
            <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
              ₹{product.originalPrice.toFixed(0)}
            </span>
          )}
          {discount && (
            <span className="ml-auto text-[10px] font-bold text-[#25A244] dark:text-green-400 shrink-0">
              {discount}% off
            </span>
          )}
        </div>

        {product.unit && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-1">{product.unit}</p>
        )}

        {/* ── Cart control ── */}
        {product.inStock ? (
          qty === 0 ? (
            <button
              onClick={() => handleCartAction(1)}
              className="mt-1.5 w-full h-9 flex items-center justify-center gap-2 text-white text-sm font-semibold rounded-lg transition-colors transition-transform duration-200 active:scale-[0.97]"
              style={{ backgroundColor: AMBER }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER_DARK; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER; }}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
              Add to Cart
            </button>
          ) : (
            <div className="mt-1.5 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1 border border-gray-200 dark:border-gray-600/50">
              <button
                onClick={() => handleQuantityChange(qty - 1)}
                className="h-7 w-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 hover:border-[#FCA311] active:scale-90 transition-colors transition-transform shadow-sm"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3 text-gray-600 dark:text-gray-300" />
              </button>
              <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                {qty}
              </span>
              <button
                onClick={() => handleQuantityChange(qty + 1)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-white active:scale-90 transition-colors transition-transform shadow-sm"
                style={{ backgroundColor: AMBER }}
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )
        ) : (
          <button
            disabled
            className="mt-1.5 w-full h-9 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden />
            Out of Stock
          </button>
        )}
      </div>
    </article>
  );
}
