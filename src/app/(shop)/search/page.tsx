import { Suspense } from "react";
import type { Metadata } from "next";
import { getProducts } from "@/services/product.service";
import ProductGrid from "@/components/product/ProductGrid";
import SortControl from "@/components/product/SortControl";
import SearchHeader from "@/components/search/SearchHeader";
import NoResults from "@/components/search/NoResults";
import type { ProductFilters } from "@/types";

// ── Metadata ──────────────────────────────────────────────────────────────────

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  return q
    ? {
        title:       `"${q}" — Search Results`,
        description: `Browse search results for "${q}" on Prakash Supermarket.`,
      }
    : {
        title:       "Search",
        description: "Search for groceries and everyday essentials.",
      };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;

  const query  = typeof params.q === "string" ? params.q.trim() : "";
  const sortBy = typeof params.sortBy === "string" ? params.sortBy : undefined;

  let products: Awaited<ReturnType<typeof getProducts>>["products"] = [];
  let total = 0;

  if (query) {
    const filters: ProductFilters = {
      search: query,
      sortBy: sortBy as ProductFilters["sortBy"] | undefined,
      limit:  100,
    };
    const result = await getProducts(filters);
    products = result.products;
    total    = result.total;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
      <SearchHeader query={query} resultCount={total} />

      {!query && (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-gray-400 text-lg">
            Start typing in the search bar above ↑
          </p>
        </div>
      )}

      {query && products.length === 0 && <NoResults query={query} />}

      {query && products.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <Suspense fallback={<SortSkeleton />}>
              <SortControl />
            </Suspense>
            <span className="text-sm text-gray-500 hidden sm:inline">
              {total} {total === 1 ? "result" : "results"}
            </span>
          </div>
          <ProductGrid products={products} />
        </div>
      )}
    </div>
  );
}

function SortSkeleton() {
  return <div className="h-8 w-44 bg-gray-200 rounded-lg animate-pulse" />;
}
