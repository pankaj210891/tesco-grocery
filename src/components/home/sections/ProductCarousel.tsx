"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import SectionCarousel from "@/components/ui/SectionCarousel";
import ProductCard from "@/components/product/ProductCard";
import type { HomepageSection, PaginatedProducts, Product } from "@/types";

const CARD_W = "flex-shrink-0 snap-start w-[calc(100vw-4rem)] sm:w-[calc(50vw-2.5rem)] lg:w-[calc(25vw-1.25rem)] xl:w-[270px]";
const ITEMS  = 8;

function SkeletonCard() {
  return (
    <div className={`${CARD_W} animate-pulse rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800`}>
      <div className="aspect-square bg-gray-100 dark:bg-gray-700" />
      <div className="p-3.5 space-y-2">
        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mt-2" />
        <div className="h-9 bg-gray-100 dark:bg-gray-700 rounded-lg mt-1" />
      </div>
    </div>
  );
}

export default function ProductCarousel({ section }: { section: HomepageSection }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // Derive sort from ctaHref (e.g. "/products?sortBy=newest" → "newest").
    // Fall back to "rating" so there is always something to show.
    const ctaParams = new URLSearchParams(section.ctaHref?.split("?")[1] ?? "");
    const sortBy    = ctaParams.get("sortBy") ?? "rating";

    // Use section.order as the page number so sibling sections with the same
    // sortBy show different products (e.g. top-picks page=2, trending page=5).
    const page = Math.max(1, section.order);

    async function load() {
      try {
        const { data } = await axios.get<{ success: boolean; data: PaginatedProducts }>(
          `/api/products?sortBy=${sortBy}&limit=${ITEMS}&page=${page}`,
        );
        // If the chosen page is beyond total results, fall back to page 1.
        const products = data.data?.products ?? [];
        if (products.length === 0 && page > 1) {
          const { data: fallback } = await axios.get<{ success: boolean; data: PaginatedProducts }>(
            `/api/products?sortBy=${sortBy}&limit=${ITEMS}&page=1`,
          );
          setProducts(fallback.data?.products ?? []);
        } else {
          setProducts(products);
        }
      } catch {
        // silently degrade — section simply stays empty
      } finally {
        setLoading(false);
      }
    }
    void load();
  // section is stable from parent; key fields won't change mid-life
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SectionCarousel
      title={section.title}
      description={section.subtitle}
      seeAllLabel={section.ctaLabel}
      seeAllHref={section.ctaHref}
      titleId={`section-${section.key}`}
    >
      {loading
        ? Array.from({ length: ITEMS }).map((_, i) => <SkeletonCard key={i} />)
        : products.map((product) => (
            <div key={product._id} className={CARD_W}>
              <ProductCard product={product} />
            </div>
          ))}
    </SectionCarousel>
  );
}
