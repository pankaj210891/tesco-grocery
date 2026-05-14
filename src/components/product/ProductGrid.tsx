import { Package } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Package
          className="h-16 w-16 text-gray-300 mb-4"
          aria-hidden
        />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          No products found
        </h3>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 max-w-xs">
          Try adjusting your filters or search terms to find what you&apos;re
          looking for.
        </p>
      </div>
    );
  }

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
