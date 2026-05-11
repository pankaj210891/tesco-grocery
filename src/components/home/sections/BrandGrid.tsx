"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import SectionHeader from "./SectionHeader";
import type { HomepageSection, SectionItem } from "@/types";

const SCROLL_PX = 320;

function BrandCard({ item }: { item: SectionItem }) {
  return (
    <Link
      href={item.href}
      className="flex-shrink-0 flex flex-col items-center gap-2 w-24 sm:w-28 group"
    >
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl select-none shadow-sm group-hover:shadow-md transition-all duration-150 group-hover:scale-105"
        style={{ backgroundColor: item.color ?? "#F3F4F6" }}
        aria-hidden
      >
        {item.emoji}
      </div>
      <span className="text-[11px] sm:text-xs font-semibold text-center text-gray-700 dark:text-gray-300 leading-tight line-clamp-2 w-full">
        {item.title}
      </span>
    </Link>
  );
}

const btnBase =
  "w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md items-center justify-center transition-all duration-200 z-10";

export default function BrandGrid({ section }: { section: HomepageSection }) {
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

        <div ref={trackRef} className="flex gap-4 sm:gap-6 overflow-x-auto overscroll-x-contain scrollbar-none pb-1 py-1">
          {section.items.map((item) => <BrandCard key={item._id} item={item} />)}
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
