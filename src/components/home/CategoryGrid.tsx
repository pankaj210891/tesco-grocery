"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Category {
  label: string;
  href:  string;
  emoji: string;
  bg:    string;
}

const SCROLL_PX = 320;

const categories: Category[] = [
  { label: "Clothing",         href: "/categories/clothing-accessories", emoji: "👗", bg: "bg-rose-100    dark:bg-rose-900"    },
  { label: "Marketplace",      href: "/categories/marketplace",          emoji: "🏪", bg: "bg-violet-100  dark:bg-violet-900"  },
  { label: "Fresh Food",       href: "/categories/fresh-food",           emoji: "🥦", bg: "bg-green-100   dark:bg-green-900"   },
  { label: "Bakery",           href: "/categories/bakery",               emoji: "🍞", bg: "bg-amber-100   dark:bg-amber-900"   },
  { label: "Frozen Food",      href: "/categories/frozen-food",          emoji: "🧊", bg: "bg-cyan-100    dark:bg-cyan-900"    },
  { label: "Treats & Snacks",  href: "/categories/treats-snacks",        emoji: "🍿", bg: "bg-orange-100  dark:bg-orange-900"  },
  { label: "Food Cupboard",    href: "/categories/food-cupboard",        emoji: "🥫", bg: "bg-yellow-100  dark:bg-yellow-900"  },
  { label: "Drinks",           href: "/categories/drinks",               emoji: "🥤", bg: "bg-purple-100  dark:bg-purple-900"  },
  { label: "Baby & Toddler",   href: "/categories/baby-toddler",         emoji: "👶", bg: "bg-pink-100    dark:bg-pink-900"    },
  { label: "Health & Beauty",  href: "/categories/health-beauty",        emoji: "🧴", bg: "bg-fuchsia-100 dark:bg-fuchsia-900" },
  { label: "Pets",             href: "/categories/pets",                 emoji: "🐾", bg: "bg-lime-100    dark:bg-lime-900"    },
  { label: "Household",        href: "/categories/household",            emoji: "🧹", bg: "bg-gray-100    dark:bg-gray-700"    },
  { label: "Home & Furniture", href: "/categories/home-furniture",       emoji: "🛋️", bg: "bg-stone-100   dark:bg-stone-800"   },
  { label: "Electronics",      href: "/categories/electronics-gaming",   emoji: "🎮", bg: "bg-blue-100    dark:bg-blue-900"    },
  { label: "Toys & Games",     href: "/categories/toys-games",           emoji: "🧸", bg: "bg-red-100     dark:bg-red-900"     },
  { label: "Parties",          href: "/categories/parties-seasonal",     emoji: "🎉", bg: "bg-teal-100    dark:bg-teal-900"    },
  { label: "Sports & Leisure", href: "/categories/sports-leisure",       emoji: "⚽", bg: "bg-indigo-100  dark:bg-indigo-900"  },
  { label: "Hobbies",          href: "/categories/hobbies-stationery",   emoji: "✏️", bg: "bg-emerald-100 dark:bg-emerald-900" },
  { label: "Garden & DIY",     href: "/categories/garden-diy-car",       emoji: "🌿", bg: "bg-green-100   dark:bg-green-900"   },
  { label: "Kiosk",            href: "/categories/kiosk",                emoji: "🏧", bg: "bg-sky-100     dark:bg-sky-900"     },
  { label: "Inspiration",      href: "/categories/inspiration-events",   emoji: "✨", bg: "bg-yellow-100  dark:bg-yellow-900"  },
];

const circleBtnBase =
  "w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center transition-all duration-200";

export default function CategoryGrid() {
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

        {/* Left fade — desktop only (left chevron handles this edge on mobile via bottom row) */}
        <div
          aria-hidden
          className={cn(
            "hidden sm:block absolute left-0 top-0 bottom-0 w-14 pointer-events-none z-[5]",
            "bg-gradient-to-r from-white dark:from-[#0F172A] to-transparent",
            "transition-opacity duration-200",
            canLeft ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Right fade — always shown */}
        <div
          aria-hidden
          className={cn(
            "absolute right-0 top-0 bottom-0 w-14 pointer-events-none z-[5]",
            "bg-gradient-to-l from-white dark:from-[#0F172A] to-transparent",
            "transition-opacity duration-200",
            canRight ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Left chevron — sm+ only, floats on the left side */}
        <button
          onClick={() => nudge("left")}
          aria-label="Scroll departments left"
          className={cn(
            "hidden sm:flex",
            "absolute left-1 top-1/2 -translate-y-1/2 z-10",
            circleBtnBase,
            canLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Scroll track */}
        <div
          ref={trackRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none py-1"
        >
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="flex-shrink-0 flex flex-col items-center gap-2 w-[68px] sm:w-[76px] group"
            >
              {/* Circle avatar */}
              <div
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center",
                  "text-2xl sm:text-3xl leading-none select-none",
                  "transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110",
                  cat.bg
                )}
              >
                {cat.emoji}
              </div>

              {/* Label */}
              <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight text-gray-700 dark:text-gray-300 line-clamp-2 w-full">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Right chevron — sm+ only, floats on the right side */}
        <button
          onClick={() => nudge("right")}
          aria-label="Scroll departments right"
          className={cn(
            "hidden sm:flex",
            "absolute right-1 top-1/2 -translate-y-1/2 z-10",
            circleBtnBase,
            canRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* ── Mobile-only: bottom-right chevron row ──────────────── */}
      <div className="flex sm:hidden justify-end gap-2 mt-3">
        <button
          onClick={() => nudge("left")}
          disabled={!canLeft}
          aria-label="Scroll departments left"
          className={cn(
            circleBtnBase,
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
            circleBtnBase,
            canRight ? "opacity-100" : "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

    </section>
  );
}
