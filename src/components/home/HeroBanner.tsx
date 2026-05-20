"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import NavArrow from "@/components/ui/NavArrow";
import MiniBannerCard from "@/components/ui/MiniBannerCard";
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

/* Right-side mini-banners — static Foodmart-style category promos */
const MINI_BANNERS = [
  {
    id:      "mini-1",
    label:   "20% Off",
    title:   "Fruits & Vegetables",
    cta:     "Shop the Category",
    href:    "/products?category=fresh-food",
    bg:      "from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-900/30",
    textColor: "text-green-800 dark:text-green-300",
    btnColor:  "text-green-700 dark:text-green-400",
    emoji:   "🥦",
  },
  {
    id:      "mini-2",
    label:   "15% Off",
    title:   "Baked Products",
    cta:     "Shop the Category",
    href:    "/products?category=bakery",
    bg:      "from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-900/30",
    textColor: "text-amber-900 dark:text-amber-300",
    btnColor:  "text-amber-700 dark:text-amber-400",
    emoji:   "🥐",
  },
];

function toBannerSlides(section: HomepageSection): BannerSlide[] {
  return [...section.items]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      id:           item._id,
      headline:     item.title,
      subline:      item.subtitle ?? "",
      cta:          item.badge ?? "Shop Now",
      href:         item.href,
      bg:           item.color ?? "from-[#FCA311] to-[#E8920A]",
      illustration: item.emoji ?? "🛒",
    }));
}

const INTERVAL_MS = 5_500;

function BannerSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div className="h-[260px] sm:h-[320px] lg:h-[360px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
      <div className="hidden lg:flex flex-col gap-4">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}

export default function HeroBanner() {
  const [slides,  setSlides]  = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(0);
  const [paused,  setPaused]  = useState(false);
  const [animKey, setAnimKey] = useState(0);
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
      className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-4"
      aria-label="Promotional banners"
    >

      {/* ── Main slider ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
      >
        <div
          key={animKey}
          className={cn(
            "bg-gradient-to-br min-h-[260px] sm:min-h-[320px] lg:min-h-[360px] relative",
            "animate-[fadeIn_0.5s_ease]",
            slide.bg,
          )}
          style={{ animationFillMode: "both" }}
        >
          {/* Decorative blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/8" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/6" />
          </div>

          <div className="relative flex items-center h-full min-h-[260px] sm:min-h-[320px] lg:min-h-[360px] px-8 sm:px-10 py-10 gap-6">

            {/* Text */}
            <div
              key={`text-${animKey}`}
              className="max-w-sm z-10 animate-[slideUp_0.5s_ease_both]"
            >
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">
                Exclusive Deal
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight mb-3 drop-shadow-sm">
                {slide.headline}
              </h2>
              <p className="text-white/75 text-sm mb-6 max-w-xs leading-relaxed">
                {slide.subline}
              </p>
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white font-bold text-sm hover:bg-[#FCA311] hover:text-white active:scale-95 transition-colors transition-transform duration-200 shadow-lg"
                style={{ color: "#FCA311" }}
              >
                {slide.cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            {/* Illustration */}
            <div
              key={`illus-${animKey}`}
              className={cn(
                "hidden sm:flex items-center justify-center shrink-0 ml-auto animate-[scaleIn_0.6s_ease_both]",
                "w-36 h-36 lg:w-48 lg:h-48 rounded-full bg-white/15 backdrop-blur-sm border border-white/20",
                "text-5xl lg:text-8xl select-none shadow-2xl",
              )}
              aria-hidden
            >
              {slide.illustration}
            </div>
          </div>
        </div>

        {/* Prev / Next */}
        <NavArrow direction="prev" onClick={prev} variant="amber" size="lg" label="Previous slide" className="absolute left-3 top-1/2 -translate-y-1/2 z-20" />
        <NavArrow direction="next" onClick={next} variant="amber" size="lg" label="Next slide" className="absolute right-3 top-1/2 -translate-y-1/2 z-20" />

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5" role="tablist" aria-label="Slide indicators">
          {slides.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "transition-[width,background-color] duration-300 rounded-full",
                i === active ? "w-6 h-2 bg-white shadow" : "w-2 h-2 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>

        {/* Auto-play progress bar */}
        {!paused && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
            <div
              key={animKey}
              className="h-full bg-[#FCA311]"
              style={{ animation: `growWidth ${INTERVAL_MS}ms linear` }}
            />
          </div>
        )}
      </div>

      {/* ── Right mini-banners (desktop only) ───────────────────── */}
      <div className="hidden lg:flex flex-col gap-4">
        {MINI_BANNERS.map((mb) => (
          <MiniBannerCard
            key={mb.id}
            href={mb.href}
            label={mb.label}
            title={mb.title}
            cta={mb.cta}
            emoji={mb.emoji}
            bg={mb.bg}
            textColor={mb.textColor}
            btnColor={mb.btnColor}
            size="lg"
            className="flex-1"
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeIn    { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp   { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes scaleIn   { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes growWidth { from { width: 0% } to { width: 100% } }
      `}</style>
    </section>
  );
}
