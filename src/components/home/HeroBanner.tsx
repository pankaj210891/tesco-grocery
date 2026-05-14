"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
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

const INTERVAL_MS = 5_500;

function BannerSkeleton() {
  return (
    <div className="h-[280px] sm:h-[340px] lg:h-[400px] bg-gradient-to-br from-[#0F4C75]/30 to-[#0A3352]/40 animate-pulse" />
  );
}

export default function HeroBanner() {
  const [slides,   setSlides]   = useState<BannerSlide[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [active,   setActive]   = useState(0);
  const [paused,   setPaused]   = useState(false);
  const [animKey,  setAnimKey]  = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/homepage/sections?type=hero-banner");
        const json = await res.json() as { data: HomepageSection[] };
        const section = json.data?.[0];
        if (section) setSlides(toBannerSlides(section));
      } catch {
        // silently degrade
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    setAnimKey((k) => k + 1);
  }, []);

  const next = useCallback(
    () => goTo((active + 1) % Math.max(slides.length, 1)),
    [active, slides.length, goTo],
  );
  const prev = useCallback(
    () => goTo((active - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1)),
    [active, slides.length, goTo],
  );

  useEffect(() => {
    if (paused || slides.length === 0) return;
    timerRef.current = setInterval(next, INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, next, slides.length]);

  if (loading) return <BannerSkeleton />;
  if (slides.length === 0) return null;

  const slide = slides[active];

  return (
    <section
      className="relative overflow-hidden"
      aria-label="Promotional banners"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide */}
      <div
        key={animKey}
        className={cn(
          "bg-gradient-to-br transition-colors duration-700",
          "animate-[fadeIn_0.5s_ease]",
          slide.bg,
        )}
        style={{ animationFillMode: "both" }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center justify-between min-h-[280px] sm:min-h-[340px] lg:min-h-[400px] py-14 gap-8">

            {/* Text content */}
            <div
              key={`text-${animKey}`}
              className="max-w-xl z-10 animate-[slideUp_0.55s_ease_both]"
            >
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">
                Exclusive Deal
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4 drop-shadow-sm">
                {slide.headline}
              </h2>
              <p className="text-white/75 text-sm sm:text-base mb-7 max-w-sm leading-relaxed">
                {slide.subline}
              </p>
              <Link
                href={slide.href}
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white font-bold text-sm sm:text-base hover:bg-[#F57C00] hover:text-white active:scale-95 transition-all duration-200 shadow-xl"
                style={{ color: "#0F4C75" }}
              >
                {slide.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>

            {/* Illustration */}
            <div
              key={`illus-${animKey}`}
              className={cn(
                "hidden sm:flex items-center justify-center shrink-0 animate-[scaleIn_0.6s_ease_both]",
                "w-44 h-44 lg:w-64 lg:h-64 rounded-full bg-white/10 backdrop-blur-sm border border-white/15",
                "text-6xl lg:text-9xl select-none shadow-2xl",
              )}
              aria-hidden
            >
              {slide.illustration}
            </div>
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/25 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 active:scale-90 transition-all"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/25 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 active:scale-90 transition-all"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Progress + dots */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2"
        role="tablist"
        aria-label="Slide indicators"
      >
        {slides.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === active}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={cn(
              "transition-all duration-300 rounded-full",
              i === active
                ? "w-8 h-2 bg-white shadow-lg"
                : "w-2 h-2 bg-white/40 hover:bg-white/70",
            )}
          />
        ))}
      </div>

      {/* Auto-play progress bar */}
      {!paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
          <div
            key={animKey}
            className="h-full bg-[#F57C00]"
            style={{ animation: `growWidth ${INTERVAL_MS}ms linear` }}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn    { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp   { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes scaleIn   { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes growWidth { from { width: 0% } to { width: 100% } }
      `}</style>
    </section>
  );
}
