"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { HomepageSection } from "@/types";

interface BannerSlide {
  id:           string;
  headline:     string;
  subline:      string;
  cta:          string;
  href:         string;
  bg:           string;
  illustration: string;
}

function toBannerSlides(section: HomepageSection): BannerSlide[] {
  return [...section.items]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      id:           item._id,
      headline:     item.title,
      subline:      item.subtitle ?? "",
      cta:          item.badge ?? "Shop Now",
      href:         item.href,
      bg:           item.color ?? "from-[#0F4C75] to-[#0A3352]",
      illustration: item.emoji ?? "🛒",
    }));
}

const INTERVAL_MS = 5_000;

function BannerSkeleton() {
  return (
    <div className="h-[260px] sm:h-[320px] lg:h-[380px] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
  );
}

export default function HeroBanner() {
  const [slides, setSlides]   = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(0);
  const [paused,  setPaused]  = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/homepage/sections?type=hero-banner");
        const json = await res.json() as { data: HomepageSection[] };
        const section = json.data?.[0];
        if (section) setSlides(toBannerSlides(section));
      } catch {
        // silently degrade — banner shows empty state
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const next = useCallback(
    () => setActive((i) => (i + 1) % Math.max(slides.length, 1)),
    [slides.length]
  );
  const prev = useCallback(
    () => setActive((i) => (i - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1)),
    [slides.length]
  );

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const id = setInterval(next, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, next, slides.length]);

  if (loading) return <BannerSkeleton />;
  if (slides.length === 0) return null;

  const slide = slides[active];

  return (
    <section
      className="relative overflow-hidden"
      aria-label="Promotional banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide */}
      <div className={cn("bg-gradient-to-br transition-all duration-700", slide.bg)}>
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
                  "bg-white font-bold text-sm sm:text-base",
                  "hover:bg-gray-100 active:scale-95 transition-all shadow-lg"
                )}
                style={{ color: "#0F4C75" }}
              >
                {slide.cta} →
              </Link>
            </div>

            {/* Illustration */}
            <div
              className={cn(
                "hidden sm:flex items-center justify-center shrink-0",
                "w-48 h-48 lg:w-64 lg:h-64 rounded-full bg-white/10",
                "text-7xl lg:text-9xl select-none"
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

      {/* Prev / Next */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 transition-colors"
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
