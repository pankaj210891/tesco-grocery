import { Suspense } from "react";
import type { Metadata } from "next";
import { mockAllProducts } from "@/lib/data/mock-products";
import { slugify, titleCase } from "@/lib/utils/format";
import ProductGrid from "@/components/product/ProductGrid";
import FiltersSidebar from "@/components/product/FiltersSidebar";
import SortControl from "@/components/product/SortControl";
import ActiveFilters from "@/components/product/ActiveFilters";
import MobileFiltersDrawer from "@/components/product/MobileFiltersDrawer";

export const metadata: Metadata = {
  title: "All Products",
  description:
    "Browse our full range of fresh groceries and everyday essentials.",
};

type RawParams = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function filterAndSort(params: RawParams) {
  const category = str(params.category);
  const minPrice = str(params.minPrice);
  const maxPrice = str(params.maxPrice);
  const inStock = str(params.inStock);
  const q = str(params.q);
  const sortBy = str(params.sortBy);

  let results = [...mockAllProducts];

  if (q) {
    const term = q.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  }

  if (category) {
    results = results.filter((p) => slugify(p.category) === category);
  }

  if (inStock === "true") {
    results = results.filter((p) => p.inStock);
  }

  if (minPrice !== undefined) {
    results = results.filter((p) => p.price >= Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== "") {
    results = results.filter((p) => p.price <= Number(maxPrice));
  }

  if (sortBy === "price-asc") {
    results.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-desc") {
    results.sort((a, b) => b.price - a.price);
  } else if (sortBy === "rating") {
    results.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === "newest") {
    results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return results;
}

// Derive unique, sorted category list from all products
const ALL_CATEGORIES = [
  ...new Set(mockAllProducts.map((p) => p.category)),
].sort();

type Props = {
  searchParams: Promise<RawParams>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const products = filterAndSort(params);
  const category = str(params.category);

  const pageTitle = category ? titleCase(category) : "All Products";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">{pageTitle}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {products.length}{" "}
          {products.length === 1 ? "product" : "products"}
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Desktop sidebar ───────────────────── */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20">
          <Suspense fallback={<SidebarSkeleton />}>
            <FiltersSidebar categories={ALL_CATEGORIES} />
          </Suspense>
        </aside>

        {/* ── Main content ─────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Mobile filter drawer */}
            <div className="lg:hidden">
              <Suspense fallback={null}>
                <MobileFiltersDrawer categories={ALL_CATEGORIES} />
              </Suspense>
            </div>

            {/* Sort */}
            <Suspense fallback={<SortSkeleton />}>
              <SortControl />
            </Suspense>

            <span className="ml-auto text-sm text-gray-500 hidden sm:inline">
              {products.length}{" "}
              {products.length === 1 ? "result" : "results"}
            </span>
          </div>

          {/* Active filter chips */}
          <Suspense fallback={null}>
            <ActiveFilters />
          </Suspense>

          {/* Product grid */}
          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  );
}

// ── Inline fallbacks ────────────────────────────────────────────────────────

function SidebarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-16" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

function SortSkeleton() {
  return <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />;
}
