"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import SectionHeader from "./SectionHeader";
import type { HomepageSection, SectionItem } from "@/types";

const SCROLL_PX = 340;

function daysLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function OfferCard({ item }: { item: SectionItem }) {
  const days = daysLeft(item.expiresAt);
  const expiry =
    days === null  ? null :
    days <= 0      ? "Offer expired" :
    days === 1     ? "⏰ Ends tomorrow" :
                     `⏰ Ends in ${days} days`;
  const href = item.productSlug ? `/products/${item.productSlug}` : item.href;

  return (
    <Link
      href={href}
      className="flex-shrink-0 w-40 sm:w-44 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/70 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
    >
      <div
        className="h-36 sm:h-40 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: item.color ?? "#F9FAFB" }}
      >
        <span className="text-5xl sm:text-6xl select-none leading-none group-hover:scale-110 transition-transform duration-300" aria-hidden>
          {item.emoji ?? "📦"}
        </span>
        {item.discount && (
          <span className="absolute top-2 right-2 px-2 py-1 text-[11px] font-black rounded-xl bg-red-500 text-white shadow-sm">
            -{item.discount}%
          </span>
        )}
      </div>

      <div className="p-3 space-y-0.5">
        {item.brand && (
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
            {item.brand}
          </p>
        )}
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2 min-h-[2.5rem]">
          {item.title}
        </p>
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          {item.price != null && (
            <span className="text-sm font-black text-red-600 dark:text-red-400">
              {formatPrice(item.price)}
            </span>
          )}
          {item.originalPrice != null && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(item.originalPrice)}
            </span>
          )}
        </div>
        {expiry && (
          <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 pt-0.5">
            {expiry}
          </p>
        )}
      </div>
    </Link>
  );
}

const btnBase =
  "w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md items-center justify-center transition-all duration-200 z-10";

export default function OfferCards({ section }: { section: HomepageSection }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [sync]);

  function nudge(dir: "left" | "right") {
    trackRef.current?.scrollBy({ left: dir === "left" ? -SCROLL_PX : SCROLL_PX, behavior: "smooth" });
  }

  return (
    <section aria-labelledby={`section-${section.key}`}>
      <SectionHeader title={section.title} subtitle={section.subtitle} ctaLabel={section.ctaLabel} ctaHref={section.ctaHref} />

      <div className="relative">
        <div aria-hidden className={cn("hidden sm:block absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-gray-50 dark:from-gray-950 to-transparent pointer-events-none z-[5] transition-opacity", canLeft ? "opacity-100" : "opacity-0")} />
        <button onClick={() => nudge("left")} aria-label="Scroll left" className={cn("hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2", btnBase, canLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
          <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        <div ref={trackRef} className="flex gap-3 sm:gap-4 overflow-x-auto overscroll-x-contain scrollbar-none pb-1">
          {section.items.map((item) => <OfferCard key={item._id} item={item} />)}
        </div>

        <button onClick={() => nudge("right")} aria-label="Scroll right" className={cn("hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2", btnBase, canRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
          <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <div aria-hidden className={cn("hidden sm:block absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent pointer-events-none z-[5] transition-opacity", canRight ? "opacity-100" : "opacity-0")} />
      </div>

      <div className="flex sm:hidden justify-end gap-2 mt-3">
        <button onClick={() => nudge("left")} disabled={!canLeft} aria-label="Scroll left" className={cn("flex", btnBase, canLeft ? "opacity-100" : "opacity-30 cursor-not-allowed")}>
          <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button onClick={() => nudge("right")} disabled={!canRight} aria-label="Scroll right" className={cn("flex", btnBase, canRight ? "opacity-100" : "opacity-30 cursor-not-allowed")}>
          <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </section>
  );
}
