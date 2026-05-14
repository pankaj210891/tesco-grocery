"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import type { HomepageSection, SectionItem } from "@/types";

const SCROLL_PX = 340;
const AMBER = "#FCA311";

function ProductCard({ item }: { item: SectionItem }) {
  const href = item.productSlug ? `/products/${item.productSlug}` : item.href;
  return (
    <Link
      href={href}
      className="flex-shrink-0 w-40 sm:w-44 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/70 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
    >
      {/* Image area */}
      <div
        className="h-36 sm:h-40 flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-gray-700/30"
      >
        <span
          className="text-5xl sm:text-6xl select-none leading-none group-hover:scale-110 transition-transform duration-300"
          aria-hidden
        >
          {item.emoji ?? "📦"}
        </span>

        {/* Sale / badge */}
        {item.badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-black rounded bg-[#25A244] text-white uppercase">
            {item.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-1">
        {item.brand && (
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
            {item.brand}
          </p>
        )}
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-[#FCA311] transition-colors">
          {item.title}
        </p>
        {item.price != null && (
          <p className="text-sm font-black text-gray-900 dark:text-white pt-0.5">
            {formatPrice(item.price)}
          </p>
        )}
        {/* Mini add-to-cart hint */}
        <div className="flex items-center justify-end pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: AMBER }}>
            <ShoppingCart className="h-3 w-3" aria-hidden />
            Add
          </span>
        </div>
      </div>
    </Link>
  );
}

const NavBtn = ({
  onClick, disabled, label, children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={cn(
      "w-8 h-8 rounded-full border-2 border-[#FCA311] bg-white dark:bg-gray-900 shadow-md flex items-center justify-center transition-all duration-200",
      disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-[#FCA311] hover:text-white",
    )}
  >
    {children}
  </button>
);

export default function ProductCarousel({ section }: { section: HomepageSection }) {
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

      {/* Header row with nav arrows */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2
            id={`section-${section.key}`}
            className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100"
          >
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{section.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {section.ctaLabel && section.ctaHref && (
            <Link
              href={section.ctaHref}
              className="hidden sm:inline text-sm font-bold mr-2 hover:underline"
              style={{ color: AMBER }}
            >
              {section.ctaLabel} →
            </Link>
          )}
          <NavBtn onClick={() => nudge("left")} disabled={!canLeft} label="Scroll left">
            <ChevronLeft className="h-4 w-4 text-[#FCA311] group-hover:text-white" />
          </NavBtn>
          <NavBtn onClick={() => nudge("right")} disabled={!canRight} label="Scroll right">
            <ChevronRight className="h-4 w-4 text-[#FCA311]" />
          </NavBtn>
        </div>
      </div>

      {/* Track */}
      <div className="relative">
        <div
          aria-hidden
          className={cn(
            "hidden sm:block absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-950 to-transparent pointer-events-none z-[5] transition-opacity",
            canLeft ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          ref={trackRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto overscroll-x-contain scrollbar-none pb-1"
        >
          {section.items.map((item) => (
            <ProductCard key={item._id} item={item} />
          ))}
        </div>
        <div
          aria-hidden
          className={cn(
            "hidden sm:block absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-950 to-transparent pointer-events-none z-[5] transition-opacity",
            canRight ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {/* Mobile CTA */}
      {section.ctaLabel && section.ctaHref && (
        <div className="flex sm:hidden justify-center mt-4">
          <Link
            href={section.ctaHref}
            className="text-sm font-bold px-5 py-2 rounded-xl border-2 border-[#FCA311] hover:bg-[#FCA311] hover:text-white transition-all"
            style={{ color: AMBER }}
          >
            {section.ctaLabel}
          </Link>
        </div>
      )}
    </section>
  );
}
