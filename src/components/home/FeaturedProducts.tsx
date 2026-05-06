import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { mockFeaturedProducts } from "@/lib/data/mock-products";

export default function FeaturedProducts() {
  return (
    <section aria-labelledby="featured-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="featured-heading"
          className="text-xl sm:text-2xl font-black text-gray-900"
        >
          Featured Products
        </h2>
        <Link
          href="/products"
          className="text-sm font-semibold text-[#00539F] hover:underline"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {mockFeaturedProducts.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
