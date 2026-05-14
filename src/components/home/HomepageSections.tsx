"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import type { HomepageSection, SectionType } from "@/types";
import ProductCarousel from "./sections/ProductCarousel";
import OfferCards      from "./sections/OfferCards";
import InfoCards       from "./sections/InfoCards";
import CategoryTiles   from "./sections/CategoryTiles";
import BrandGrid        from "./sections/BrandGrid";
import BrandInspiration from "./sections/BrandInspiration";
import ExploreCards     from "./sections/ExploreCards";

const RENDERERS: Partial<Record<SectionType, React.ComponentType<{ section: HomepageSection }>>> = {
  "product-carousel":   ProductCarousel,
  "offer-cards":        OfferCards,
  "info-cards":         InfoCards,
  "category-tiles":     CategoryTiles,
  "brand-grid":         BrandGrid,
  "brand-inspiration":  BrandInspiration,
  "explore-cards":      ExploreCards,
  // "hero-banner" not rendered inline
};

function SectionSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <div className="space-y-4">
      {/* Header shimmer */}
      <div className="flex items-center gap-3">
        <div className="animate-pulse w-1 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
        <div className="space-y-2">
          <div className="animate-pulse h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="animate-pulse h-3 w-72 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
      {/* Card shimmer */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex-shrink-0 w-40 sm:w-44 rounded-2xl overflow-hidden"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-36 sm:h-40 bg-gray-100 dark:bg-gray-800" />
            <div className="p-3 space-y-2 bg-white dark:bg-gray-800">
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomepageSections() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await axios.get<{ data: HomepageSection[] }>("/api/homepage/sections");
        setSections(data.data ?? []);
      } catch {
        // silently degrade — homepage still works without sections
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-12">
        {[1, 2, 3].map((n) => <SectionSkeleton key={n} />)}
      </div>
    );
  }

  if (sections.length === 0) return null;

  return (
    <div className="space-y-14">
      {sections.map((section) => {
        const Renderer = RENDERERS[section.type];
        if (!Renderer) return null;
        return <Renderer key={section.key} section={section} />;
      })}
    </div>
  );
}
