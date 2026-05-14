"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import SectionHeader from "./SectionHeader";
import type { HomepageSection, SectionItem } from "@/types";

const SCROLL_PX = 320;

function BrandCard({ item }: { item: SectionItem }) {
  // Always navigate to the products page filtered by this brand
  const brandHref = `/products?brand=${encodeURIComponent(item.title)}`;
  return (
    <Link
      href={brandHref}
      className="flex-shrink-0 w-64 sm:w-72 h-48 sm:h-52 rounded-2xl overflow-hidden group relative"
      style={{ backgroundColor: item.color ?? "#1E293B" }}
    >
      {/* Gradient overlay — stronger at bottom so text is always readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Emoji — pinned top-right, never affects bottom content */}
      <div
        className="absolute top-4 right-5 text-5xl sm:text-6xl select-none leading-none opacity-90"
        aria-hidden
      >
        {item.emoji}
      </div>

      {/* Brand info — pinned to bottom, always fully visible */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
          Brand Partner
        </p>
        <h3 className="text-white text-xl sm:text-2xl font-black leading-tight mb-1 line-clamp-2">
          {item.title}
        </h3>
        <p className="text-white/80 text-sm font-medium leading-snug mb-3 line-clamp-1">
          {item.subtitle}
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-sm border border-white/30 group-hover:bg-white/30 transition-colors">
          Explore range →
        </span>
      </div>
    </Link>
  );
}

const btnBase =
  "w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md items-center justify-center transition-all duration-200 z-10";

export default function BrandInspiration({ section }: { section: HomepageSection }) {
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
        <div aria-hidden className={cn("hidden sm:block absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-50 dark:from-gray-950 to-transparent pointer-events-none z-[5] transition-opacity", canLeft ? "opacity-100" : "opacity-0")} />
        <button onClick={() => nudge("left")} aria-label="Scroll left" className={cn("hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2", btnBase, canLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
          <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        <div ref={trackRef} className="flex gap-4 overflow-x-auto overscroll-x-contain scrollbar-none pb-1">
          {section.items.map((item) => <BrandCard key={item._id} item={item} />)}
        </div>

        <button onClick={() => nudge("right")} aria-label="Scroll right" className={cn("hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2", btnBase, canRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
          <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <div aria-hidden className={cn("hidden sm:block absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent pointer-events-none z-[5] transition-opacity", canRight ? "opacity-100" : "opacity-0")} />
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
