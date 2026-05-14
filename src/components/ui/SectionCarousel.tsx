"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import NavArrow from "@/components/ui/NavArrow";

const SCROLL_PX = 340;

interface SectionCarouselProps {
  title: string;
  description?: string;
  seeAllLabel?: string;
  seeAllHref?: string;
  titleId?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionCarousel({
  title,
  description,
  seeAllLabel = "See all",
  seeAllHref,
  titleId,
  children,
  className,
}: SectionCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
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
    <section aria-labelledby={titleId} className={className}>

      {/* Header: title + description left · see-all right */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h2 id={titleId} className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="shrink-0 text-sm font-bold text-[#FCA311] hover:text-[#E8920A] transition-colors whitespace-nowrap"
          >
            {seeAllLabel} →
          </Link>
        )}
      </div>

      {/* Scroll track */}
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
          {children}
        </div>
        <div
          aria-hidden
          className={cn(
            "hidden sm:block absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-950 to-transparent pointer-events-none z-[5] transition-opacity",
            canRight ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {/* Nav arrows — bottom right */}
      <div className="flex justify-end gap-2 mt-3">
        <NavArrow direction="prev" onClick={() => nudge("left")} disabled={!canLeft} label="Scroll left" />
        <NavArrow direction="next" onClick={() => nudge("right")} disabled={!canRight} label="Scroll right" />
      </div>

    </section>
  );
}
