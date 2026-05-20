import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { getProducts } from "@/services/product.service";
import { slugify } from "@/lib/utils/format";
import type { Product } from "@/types";

interface RelatedProductsProps {
  currentProduct: Product;
}

export default async function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const categorySlug = slugify(currentProduct.category);

  const { products } = await getProducts({ category: categorySlug, limit: 5 });
  const related = products
    .filter((p) => p._id !== currentProduct._id)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-14">
      <div className="flex items-center justify-between mb-5">
        <h2
          id="related-heading"
          className="text-xl font-black text-gray-900 dark:text-gray-100"
        >
          You might also like
        </h2>
        <Link
          href={`/products?category=${categorySlug}`}
          className="text-sm font-semibold text-[#FCA311] dark:text-amber-400 hover:underline"
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
