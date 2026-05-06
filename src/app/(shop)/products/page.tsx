import { Suspense } from "react";
import type { Metadata } from "next";
import { titleCase } from "@/lib/utils/format";
import { getProducts, getCategories } from "@/services/product.service";
import type { ProductFilters } from "@/types";
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

type Props = {
  searchParams: Promise<RawParams>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;

  const filters: ProductFilters = {
    category:  str(params.category),
    search:    str(params.q),
    sortBy:    str(params.sortBy) as ProductFilters["sortBy"] | undefined,
    inStock:   str(params.inStock) === "true" ? true : undefined,
    minPrice:  str(params.minPrice) !== undefined ? Number(str(params.minPrice)) : undefined,
    maxPrice:  str(params.maxPrice) !== undefined && str(params.maxPrice) !== ""
                 ? Number(str(params.maxPrice))
                 : undefined,
  };

  const [{ products, total }, categories] = await Promise.all([
    getProducts(filters),
    getCategories(),
  ]);

  const categoryNames = categories.map((c) => c.name).sort();
  const category      = str(params.category);
  const pageTitle     = category ? titleCase(category) : "All Products";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">{pageTitle}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} {total === 1 ? "product" : "products"}
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Desktop sidebar ───────────────────── */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20">
          <Suspense fallback={<SidebarSkeleton />}>
            <FiltersSidebar categories={categoryNames} />
          </Suspense>
        </aside>

        {/* ── Main content ─────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="lg:hidden">
              <Suspense fallback={null}>
                <MobileFiltersDrawer categories={categoryNames} />
              </Suspense>
            </div>

            <Suspense fallback={<SortSkeleton />}>
              <SortControl />
            </Suspense>

            <span className="ml-auto text-sm text-gray-500 hidden sm:inline">
              {total} {total === 1 ? "result" : "results"}
            </span>
          </div>

          <Suspense fallback={null}>
            <ActiveFilters />
          </Suspense>

          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  );
}

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
