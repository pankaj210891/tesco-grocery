import { Suspense } from "react";
import type { Metadata } from "next";
import { mockAllProducts } from "@/lib/data/mock-products";
import ProductGrid from "@/components/product/ProductGrid";
import SortControl from "@/components/product/SortControl";
import SearchHeader from "@/components/search/SearchHeader";
import NoResults from "@/components/search/NoResults";
import type { Product } from "@/types";

// ── Relevance scoring ─────────────────────────────────────────────────────────

function scoreProduct(product: Product, term: string): number {
  const t = term.toLowerCase();
  const name = product.name.toLowerCase();
  const brand = product.brand.toLowerCase();
  const category = product.category.toLowerCase();
  const description = product.description.toLowerCase();
  const tags = product.tags.map((tag) => tag.toLowerCase());

  return (
    (name === t ? 20 : 0) +               // exact name match
    (name.startsWith(t) ? 10 : 0) +       // name starts with term
    (name.includes(t) ? 8 : 0) +          // name contains term
    (brand.includes(t) ? 5 : 0) +         // brand match
    (category.includes(t) ? 4 : 0) +      // category match
    (tags.some((tag) => tag.includes(t)) ? 3 : 0) + // tag match
    (description.includes(t) ? 1 : 0)     // description match
  );
}

function searchProducts(query: string, sortBy?: string): Product[] {
  const term = query.toLowerCase().trim();
  if (!term) return [];

  const scored = mockAllProducts
    .map((product) => ({ product, score: scoreProduct(product, term) }))
    .filter(({ score }) => score > 0);

  if (!sortBy || sortBy === "relevance") {
    return scored
      .sort((a, b) => b.score - a.score)
      .map(({ product }) => product);
  }

  const products = scored.map(({ product }) => product);

  switch (sortBy) {
    case "price-asc":
      return [...products].sort((a, b) => a.price - b.price);
    case "price-desc":
      return [...products].sort((a, b) => b.price - a.price);
    case "rating":
      return [...products].sort((a, b) => b.rating - a.rating);
    case "newest":
      return [...products].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    default:
      return products;
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const q =
    typeof params.q === "string" ? params.q.trim() : "";

  return q
    ? {
        title: `"${q}" — Search Results`,
        description: `Browse search results for "${q}" on Prakash Supermarket.`,
      }
    : {
        title: "Search",
        description: "Search for groceries and everyday essentials.",
      };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;

  const query =
    typeof params.q === "string" ? params.q.trim() : "";
  const sortBy =
    typeof params.sortBy === "string" ? params.sortBy : undefined;

  const products = searchProducts(query, sortBy);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
      {/* Header: query + result count */}
      <SearchHeader query={query} resultCount={products.length} />

      {/* ── No query ─────────────────────────────────── */}
      {!query && (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-gray-400 text-lg">
            Start typing in the search bar above ↑
          </p>
        </div>
      )}

      {/* ── Query with no results ────────────────────── */}
      {query && products.length === 0 && <NoResults query={query} />}

      {/* ── Query with results ───────────────────────── */}
      {query && products.length > 0 && (
        <div>
          {/* Controls row */}
          <div className="flex items-center justify-between mb-5">
            <Suspense fallback={<SortSkeleton />}>
              <SortControl />
            </Suspense>
            <span className="text-sm text-gray-500 hidden sm:inline">
              {products.length}{" "}
              {products.length === 1 ? "result" : "results"}
            </span>
          </div>

          {/* Results grid */}
          <ProductGrid products={products} />
        </div>
      )}
    </div>
  );
}

function SortSkeleton() {
  return (
    <div className="h-8 w-44 bg-gray-200 rounded-lg animate-pulse" />
  );
}
