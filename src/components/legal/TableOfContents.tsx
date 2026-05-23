"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import type { LegalSection } from "@/types";

interface TableOfContentsProps {
  sections: LegalSection[];
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const sectionEls = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(id);
  }

  return (
    <nav aria-label="Table of contents" className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-2">
        On this page
      </p>
      {sections.map((section) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            className={cn(
              "w-full text-left px-3 py-1.5 rounded-lg text-[13px] leading-snug transition-all duration-150",
              isActive
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold border-l-2 border-amber-500"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60"
            )}
          >
            {section.title}
          </button>
        );
      })}
    </nav>
  );
}
