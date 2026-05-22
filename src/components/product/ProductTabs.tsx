"use client";

import { useState, useEffect } from "react";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiClient } from "@/lib/axios";
import ReviewsSection from "@/components/product/reviews/ReviewsSection";
import type { Product } from "@/types";

const TABS = [
  { key: "details",  label: "Product Details" },
  { key: "reviews",  label: "Reviews" },
] as const;

type Tab = typeof TABS[number]["key"];

export default function ProductTabs({ product }: { product: Product }) {
  const [active,      setActive]      = useState<Tab>("details");
  const [reviewCount, setReviewCount] = useState(product.reviewCount);

  // Eagerly fetch the live count so the tab badge is always accurate,
  // even if the user never opens the Reviews tab.
  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: { reviews: unknown[]; summary: { total: number } } }>(
        `/api/products/${product.slug}/reviews`,
        { params: { page: 1, limit: 1 } }
      )
      .then(({ data }) => { if (data.success) setReviewCount(data.data.summary.total); })
      .catch(() => {});
  }, [product.slug]);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px",
              active === tab.key
                ? "border-[#FCA311] text-[#FCA311] dark:text-amber-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {tab.label}
            {tab.key === "reviews" && reviewCount > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                ({reviewCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {active === "details" && (
        <div className="max-w-3xl space-y-8">
          {/* Description */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
              Description
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {product.description}
            </p>
          </section>

          {/* Product info grid */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
              Product Information
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Brand",    value: product.brand },
                { label: "Category", value: product.category },
                { label: "Unit",     value: product.unit },
                { label: "In Stock", value: product.inStock ? "Yes" : "No" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3">
                  <dt className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
                    {label}
                  </dt>
                  <dd className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Tags */}
          {product.tags.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                <Tag className="h-3.5 w-3.5 text-gray-400 mt-0.5" aria-hidden />
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Delivery & Returns */}
          <section className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Delivery & Returns
            </h2>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-disc list-inside">
              <li>Free delivery on orders over ₹500</li>
              <li>Next-day delivery available for ₹49</li>
              <li>Click & Collect free at all Prakash stores</li>
              <li>Returns accepted within 14 days — see <a href="/help" className="text-[#FCA311] dark:text-amber-400 hover:underline">Help Centre</a> for details</li>
            </ul>
          </section>
        </div>
      )}

      {active === "reviews" && (
        <div className="max-w-3xl">
          <ReviewsSection
            productSlug={product.slug}
            onCountLoaded={setReviewCount}
          />
        </div>
      )}
    </div>
  );
}
