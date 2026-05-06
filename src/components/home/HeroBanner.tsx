"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Slide {
  id: number;
  headline: string;
  subline: string;
  cta: string;
  href: string;
  bg: string;
  accent: string;
  illustration: string;
}

const slides: Slide[] = [
  {
    id: 1,
    headline: "Fresh Food, Every Day",
    subline: "Locally sourced, quality guaranteed — delivered to your door.",
    cta: "Shop Fresh Food",
    href: "/categories/fresh-food",
    bg: "from-[#00539F] to-[#003B7A]",
    accent: "bg-white/10",
    illustration: "🥦",
  },
  {
    id: 2,
    headline: "Up to 50% Off Selected Items",
    subline: "Huge savings across bakery, dairy and more. Limited time only.",
    cta: "View Deals",
    href: "/products?sortBy=price-asc",
    bg: "from-[#EE1C2E] to-[#9B0E1D]",
    accent: "bg-white/10",
    illustration: "🛒",
  },
  {
    id: 3,
    headline: "Free Delivery Over £40",
    subline: "Fill your basket and we'll bring it straight to you, free.",
    cta: "Start Shopping",
    href: "/products",
    bg: "from-[#003B7A] to-[#001E4A]",
    accent: "bg-white/10",
    illustration: "🚚",
  },
];

const INTERVAL_MS = 5000;

export default function HeroBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(
    () => setActive((i) => (i + 1) % slides.length),
    []
  );
  const prev = useCallback(
    () => setActive((i) => (i - 1 + slides.length) % slides.length),
    []
  );

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = slides[active];

  return (
    <section
      className="relative overflow-hidden"
      aria-label="Promotional banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div
        className={cn(
          "bg-gradient-to-br transition-all duration-700",
          slide.bg
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between min-h-[260px] sm:min-h-[320px] lg:min-h-[380px] py-12">
            {/* Text */}
            <div className="max-w-lg z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-3">
                {slide.headline}
              </h2>
              <p className="text-white/80 text-base sm:text-lg mb-6 max-w-sm">
                {slide.subline}
              </p>
              <Link
                href={slide.href}
                className={cn(
                  "inline-flex items-center px-6 py-3 rounded-full",
                  "bg-white text-[#00539F] font-bold text-sm sm:text-base",
                  "hover:bg-gray-100 active:scale-95 transition-all shadow-lg"
                )}
              >
                {slide.cta} →
              </Link>
            </div>

            {/* Illustration */}
            <div
              className={cn(
                "hidden sm:flex items-center justify-center",
                "w-48 h-48 lg:w-64 lg:h-64 rounded-full",
                slide.accent,
                "text-7xl lg:text-9xl select-none shrink-0"
              )}
              aria-hidden
            >
              {slide.illustration}
            </div>

            {/* Decorative circle */}
            <div
              className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none"
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Prev / Next buttons */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 z-20",
          "w-9 h-9 rounded-full bg-black/20 text-white flex items-center justify-center",
          "hover:bg-black/40 transition-colors"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 z-20",
          "w-9 h-9 rounded-full bg-black/20 text-white flex items-center justify-center",
          "hover:bg-black/40 transition-colors"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dot indicators */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
        role="tablist"
        aria-label="Slide indicators"
      >
        {slides.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === active}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn(
              "transition-all rounded-full",
              i === active
                ? "w-6 h-2.5 bg-white"
                : "w-2.5 h-2.5 bg-white/50 hover:bg-white/75"
            )}
          />
        ))}
      </div>
    </section>
  );
}
