import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/types";

interface FeaturedProductsProps {
  products: Product[];
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="featured-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="featured-heading"
          className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white"
        >
          Featured Products
        </h2>
        <Link
          href="/products"
          className="text-sm font-semibold hover:underline transition-colors"
          style={{ color: "#FCA311" }}
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
