"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Category } from "@/types";

interface CategoryGridProps {
  categories: Category[];
}

const SCROLL_PX = 320;

const btnShape =
  "w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md items-center justify-center transition-all duration-200";

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const trackRef  = useRef<HTMLDivElement>(null);
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
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync]);

  function nudge(dir: "left" | "right") {
    trackRef.current?.scrollBy({
      left: dir === "left" ? -SCROLL_PX : SCROLL_PX,
      behavior: "smooth",
    });
  }

  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="dept-heading">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <h2
          id="dept-heading"
          className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100"
        >
          Shop by Department
        </h2>
        <Link
          href="/categories"
          className="text-sm font-semibold text-[#0F4C75] dark:text-blue-400 hover:underline"
        >
          All departments →
        </Link>
      </div>

      {/* ── Carousel ───────────────────────────────────────────── */}
      <div className="relative">

        {/* Left edge fade */}
        <div
          aria-hidden
          className={cn(
            "hidden sm:block absolute left-0 top-0 bottom-0 w-14 pointer-events-none z-[5]",
            "bg-gradient-to-r from-white dark:from-[#0F172A] to-transparent",
            "transition-opacity duration-200",
            canLeft ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Right edge fade */}
        <div
          aria-hidden
          className={cn(
            "absolute right-0 top-0 bottom-0 w-14 pointer-events-none z-[5]",
            "bg-gradient-to-l from-white dark:from-[#0F172A] to-transparent",
            "transition-opacity duration-200",
            canRight ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Left chevron */}
        <button
          onClick={() => nudge("left")}
          aria-label="Scroll departments left"
          className={cn(
            "hidden sm:flex",
            "absolute left-1 top-1/2 -translate-y-1/2 z-10",
            btnShape,
            canLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Scroll track */}
        <div
          ref={trackRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto overscroll-x-contain scrollbar-none py-1"
        >
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="flex-shrink-0 flex flex-col items-center gap-2 w-[68px] sm:w-[76px] group"
            >
              <div
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center",
                  "text-2xl sm:text-3xl leading-none select-none",
                  "transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110",
                  cat.color,
                  "dark:bg-gray-800"
                )}
              >
                {cat.emoji}
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight text-gray-700 dark:text-gray-300 line-clamp-2 w-full">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

        {/* Right chevron */}
        <button
          onClick={() => nudge("right")}
          aria-label="Scroll departments right"
          className={cn(
            "hidden sm:flex",
            "absolute right-1 top-1/2 -translate-y-1/2 z-10",
            btnShape,
            canRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* ── Mobile chevrons ─────────────────────────────────────── */}
      <div className="flex sm:hidden justify-end gap-2 mt-3">
        <button
          onClick={() => nudge("left")}
          disabled={!canLeft}
          aria-label="Scroll departments left"
          className={cn(
            "flex",
            btnShape,
            canLeft ? "opacity-100" : "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={() => nudge("right")}
          disabled={!canRight}
          aria-label="Scroll departments right"
          className={cn(
            "flex",
            btnShape,
            canRight ? "opacity-100" : "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

    </section>
  );
}
