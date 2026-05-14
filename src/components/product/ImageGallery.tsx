"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

const AUTO_SLIDE_MS = 3500;

export default function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [selected,  setSelected]  = useState(0);
  const [paused,    setPaused]    = useState(false);
  const touchStart  = useRef<number | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = images.length;
  const src   = images[selected] ?? "/images/placeholder-product.png";

  const go = useCallback((dir: 1 | -1) => {
    setSelected((i) => (i + dir + count) % count);
  }, [count]);

  // Auto-slide — pauses on hover / touch
  useEffect(() => {
    if (count <= 1 || paused) return;
    timerRef.current = setTimeout(() => go(1), AUTO_SLIDE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [selected, paused, count, go]);

  // Touch swipe handlers
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStart.current = null;
    setPaused(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-6 transition-opacity duration-300"
          priority
        />

        {/* Prev / Next arrows — only when >1 image */}
        {count > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-900/80 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-900"
            >
              <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-200" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-900/80 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-900"
            >
              <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-200" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {count > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                aria-label={`Go to image ${i + 1}`}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === selected
                    ? "w-4 h-1.5 bg-[#00539F]"
                    : "w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip — only when >1 image */}
      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === selected}
              className={cn(
                "relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                i === selected
                  ? "border-[#00539F] shadow-sm scale-105"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-400 opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={img}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
