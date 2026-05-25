"use client";

import { memo, useRef, useEffect, useLayoutEffect, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Package } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/types";

// Threshold above which the virtualizer activates.
// Below 30 items the overhead of virtualization outweighs the benefit.
const VIRTUALIZE_THRESHOLD = 30;

// Estimated card height for the virtualizer's size estimator.
// Actual sizes vary by content; overscan=2 compensates for measurement lag.
const ESTIMATED_ROW_HEIGHT = 400;

function useColumnsCount(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [cols, setCols] = useState(2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function update() {
      const w = el!.clientWidth;
      if (w >= 1280) setCols(4);
      else if (w >= 1024) setCols(3);
      else setCols(2);
    }
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return cols;
}

// ── Virtualised grid for large lists ─────────────────────────────────────────

function VirtualProductGrid({ products }: { products: Product[] }) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const cols          = useColumnsCount(containerRef);
  const rowCount      = Math.ceil(products.length / cols);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    setScrollMargin(containerRef.current?.offsetTop ?? 0);
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count:        rowCount,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan:     2,
    scrollMargin,
  });

  return (
    <div ref={containerRef}>
      <div
        style={{
          height:   `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * cols;
          const rowItems = products.slice(startIdx, startIdx + cols);

          return (
            <div
              key={virtualRow.index}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position:  "absolute",
                top:       0,
                transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                width:     "100%",
              }}
              className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-3 sm:pb-4"
            >
              {rowItems.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Plain grid for small lists ────────────────────────────────────────────────

function PlainProductGrid({ products }: { products: Product[] }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
      aria-label={`${products.length} products`}
    >
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface ProductGridProps {
  products: Product[];
}

function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Package className="h-16 w-16 text-gray-300 mb-4" aria-hidden />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          No products found
        </h3>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 max-w-xs">
          Try adjusting your filters or search terms to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  if (products.length > VIRTUALIZE_THRESHOLD) {
    return <VirtualProductGrid products={products} />;
  }

  return <PlainProductGrid products={products} />;
}

export default memo(ProductGrid);
