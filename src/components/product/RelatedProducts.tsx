import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { mockAllProducts } from "@/lib/data/mock-products";
import type { Product } from "@/types";

interface RelatedProductsProps {
  currentProduct: Product;
}

export default function RelatedProducts({
  currentProduct,
}: RelatedProductsProps) {
  const related = mockAllProducts
    .filter(
      (p) =>
        p._id !== currentProduct._id &&
        p.category === currentProduct.category
    )
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-14">
      <div className="flex items-center justify-between mb-5">
        <h2
          id="related-heading"
          className="text-xl font-black text-gray-900"
        >
          You might also like
        </h2>
        <Link
          href={`/categories/${currentProduct.category
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`}
          className="text-sm font-semibold text-[#00539F] hover:underline"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {related.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}
