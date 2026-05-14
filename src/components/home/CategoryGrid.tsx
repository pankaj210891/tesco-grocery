"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Category } from "@/types";

interface CategoryGridProps {
  categories: Category[];
}

const SCROLL_PX = 340;

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

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 id="dept-heading" className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
          Category
        </h2>
        <Link
          href="/categories"
          className="text-sm font-semibold hover:underline transition-colors"
          style={{ color: "#FCA311" }}
        >
          View All Categories →
        </Link>
      </div>

      {/* Carousel */}
      <div className="relative">

        {/* Edge fades */}
        <div
          aria-hidden
          className={cn(
            "hidden sm:block absolute left-0 top-0 bottom-0 w-10 pointer-events-none z-[5]",
            "bg-gradient-to-r from-white dark:from-gray-950 to-transparent transition-opacity duration-200",
            canLeft ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "absolute right-0 top-0 bottom-0 w-10 pointer-events-none z-[5]",
            "bg-gradient-to-l from-white dark:from-gray-950 to-transparent transition-opacity duration-200",
            canRight ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Left arrow */}
        <button
          onClick={() => nudge("left")}
          aria-label="Scroll categories left"
          className={cn(
            "hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10",
            "w-8 h-8 rounded-full border-2 border-[#FCA311] bg-white dark:bg-gray-900 shadow-md items-center justify-center transition-all duration-200",
            canLeft ? "opacity-100 pointer-events-auto hover:bg-[#FCA311] hover:text-white" : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronLeft className="h-4 w-4 text-[#FCA311] group-hover:text-white" />
        </button>

        {/* Scroll track */}
        <div
          ref={trackRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto overscroll-x-contain scrollbar-none py-2 px-1"
        >
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-2.5 p-3 sm:p-4 rounded-2xl",
                "w-[88px] sm:w-[100px]",
                "bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700",
                "shadow-sm hover:shadow-md hover:border-[#FCA311] dark:hover:border-[#FCA311]",
                "transition-all duration-200 group",
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center",
                  "text-2xl sm:text-3xl leading-none select-none",
                  "transition-transform duration-150 group-hover:scale-110",
                  cat.color,
                  "dark:bg-gray-700/60",
                )}
              >
                {cat.emoji}
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight text-gray-700 dark:text-gray-300 line-clamp-2 w-full group-hover:text-[#FCA311] transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => nudge("right")}
          aria-label="Scroll categories right"
          className={cn(
            "hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10",
            "w-8 h-8 rounded-full border-2 border-[#FCA311] bg-white dark:bg-gray-900 shadow-md items-center justify-center transition-all duration-200",
            canRight ? "opacity-100 pointer-events-auto hover:bg-[#FCA311]" : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="h-4 w-4 text-[#FCA311]" />
        </button>
      </div>

      {/* Mobile chevrons */}
      <div className="flex sm:hidden justify-end gap-2 mt-3">
        <button
          onClick={() => nudge("left")}
          disabled={!canLeft}
          aria-label="Scroll categories left"
          className={cn(
            "flex w-8 h-8 rounded-full border-2 border-[#FCA311] bg-white dark:bg-gray-900 shadow-md items-center justify-center transition-all",
            canLeft ? "opacity-100" : "opacity-30 cursor-not-allowed",
          )}
        >
          <ChevronLeft className="h-4 w-4 text-[#FCA311]" />
        </button>
        <button
          onClick={() => nudge("right")}
          disabled={!canRight}
          aria-label="Scroll categories right"
          className={cn(
            "flex w-8 h-8 rounded-full border-2 border-[#FCA311] bg-white dark:bg-gray-900 shadow-md items-center justify-center transition-all",
            canRight ? "opacity-100" : "opacity-30 cursor-not-allowed",
          )}
        >
          <ChevronRight className="h-4 w-4 text-[#FCA311]" />
        </button>
      </div>

    </section>
  );
}
