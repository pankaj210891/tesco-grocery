"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import NavArrow from "@/components/ui/NavArrow";
import { cn } from "@/lib/utils/cn";

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

const AUTO_SLIDE_MS = 3500;

export default function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = images.length;
  const src = images[selected] ?? "/images/placeholder-product.png";

  const go = useCallback((dir: 1 | -1) => {
    setSelected((i) => (i + dir + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    timerRef.current = setTimeout(() => go(1), AUTO_SLIDE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [selected, paused, count, go]);

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
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 items-start">
        {/* Left: Vertical thumbnail strip — only when >1 image */}
        {count > 1 && (
          <div className="hidden sm:flex flex-col gap-2 shrink-0">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={i === selected}
                className={cn(
                  "relative h-[72px] w-[72px] rounded-xl overflow-hidden border-2 transition-all duration-200",
                  i === selected
                    ? "border-[#FCA311] shadow-md"
                    : "border-gray-200 dark:border-gray-600 opacity-55 hover:opacity-100 hover:border-gray-400 dark:hover:border-gray-400",
                )}
              >
                <Image
                  src={img}
                  alt={`${alt} ${i + 1}`}
                  fill
                  sizes="72px"
                  className="object-contain p-1.5"
                />
              </button>
            ))}
          </div>
        )}

        {/* Right: Main image */}
        <div
          className="relative flex-1 aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 group min-w-0"
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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 40vw"
            className="object-contain p-8 transition-opacity duration-300"
            priority
          />

          {count > 1 && (
            <>
              <NavArrow direction="prev" onClick={() => go(-1)} variant="amber" label="Previous image" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100" />
              <NavArrow direction="next" onClick={() => go(1)} variant="amber" label="Next image" className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100" />
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
                      ? "w-4 h-1.5 bg-[#FCA311]"
                      : "w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: horizontal thumbnail strip below main image */}
      {count > 1 && (
        <div className="flex sm:hidden gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === selected}
              className={cn(
                "relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                i === selected
                  ? "border-[#FCA311] shadow-sm"
                  : "border-gray-200 dark:border-gray-600 opacity-60 hover:opacity-100 hover:border-gray-400",
              )}
            >
              <Image
                src={img}
                alt={`${alt} ${i + 1}`}
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
