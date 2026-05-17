import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/services/product.service";
import { searchCategories } from "@/services/category.service";
import ProductGrid from "@/components/product/ProductGrid";
import SortControl from "@/components/product/SortControl";
import SearchHeader from "@/components/search/SearchHeader";
import NoResults from "@/components/search/NoResults";
import type { ProductFilters, Category } from "@/types";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  return q
    ? { title: `"${q}" — Search Results`, description: `Browse search results for "${q}" on Prakash Supermarket.` }
    : { title: "Search", description: "Search for groceries and everyday essentials." };
}

function CategoryChips({ categories }: { categories: Category[] }) {
  return (
    <section className="mb-6">
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        Matching categories
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Link
            key={cat._id}
            href={`/categories/${cat.slug}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#FCA311]/40 bg-amber-50 dark:bg-amber-950/20 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-[#FCA311] transition-colors"
          >
            <span className="text-base leading-none">{cat.emoji}</span>
            {cat.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query  = typeof params.q === "string" ? params.q.trim() : "";
  const sortBy = typeof params.sortBy === "string" ? params.sortBy : undefined;

  let products: Awaited<ReturnType<typeof getProducts>>["products"] = [];
  let total = 0;
  let matchingCategories: Category[] = [];

  if (query) {
    const filters: ProductFilters = {
      search: query,
      sortBy: sortBy as ProductFilters["sortBy"] | undefined,
      limit:  100,
    };
    const [productResult, cats] = await Promise.all([
      getProducts(filters),
      searchCategories(query),
    ]);
    products            = productResult.products;
    total               = productResult.total;
    matchingCategories  = cats;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
      <SearchHeader query={query} resultCount={total} />

      {!query && (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-lg">
            Start typing in the search bar above ↑
          </p>
        </div>
      )}

      {query && (
        <>
          {matchingCategories.length > 0 && (
            <CategoryChips categories={matchingCategories} />
          )}

          {products.length === 0 && <NoResults query={query} />}

          {products.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <Suspense fallback={<SortSkeleton />}>
                  <SortControl />
                </Suspense>
                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                  {total} {total === 1 ? "result" : "results"}
                </span>
              </div>
              <ProductGrid products={products} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SortSkeleton() {
  return <div className="h-8 w-44 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />;
}
