"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import type { HomepageSection, SectionType } from "@/types";
import ProductCarousel  from "./sections/ProductCarousel";
import OfferCards       from "./sections/OfferCards";
import BrandInspiration from "./sections/BrandInspiration";
import InfoCards        from "./sections/InfoCards";
import CategoryTiles    from "./sections/CategoryTiles";
import BrandGrid        from "./sections/BrandGrid";
import ExploreCards     from "./sections/ExploreCards";

const RENDERERS: Partial<Record<SectionType, React.ComponentType<{ section: HomepageSection }>>> = {
  "product-carousel":  ProductCarousel,
  "offer-cards":       OfferCards,
  "brand-inspiration": BrandInspiration,
  "info-cards":        InfoCards,
  "category-tiles":    CategoryTiles,
  "brand-grid":        BrandGrid,
  "explore-cards":     ExploreCards,
  // "hero-banner" is rendered by the dedicated HeroBanner component
};

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse h-7 w-56 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="animate-pulse h-4 w-80 bg-gray-100 dark:bg-gray-800 rounded" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="animate-pulse flex-shrink-0 w-40 h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
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
