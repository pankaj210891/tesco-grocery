import { Suspense } from "react";
import type { Metadata } from "next";
import { titleCase } from "@/lib/utils/format";
import { getProducts, getCategories, getFilterMeta } from "@/services/product.service";
import type { DeliveryOption, ProductFilters, SortBy } from "@/types";
import ProductGrid from "@/components/product/ProductGrid";
import FiltersSidebar from "@/components/product/FiltersSidebar";
import SortControl from "@/components/product/SortControl";
import ActiveFilters from "@/components/product/ActiveFilters";
import MobileFiltersDrawer from "@/components/product/MobileFiltersDrawer";
import Pagination from "@/components/ui/Pagination";
import PageSizeSelector from "@/components/ui/PageSizeSelector";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse our full range of fresh groceries and everyday essentials.",
};

type RawParams = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// Safely parse a URL string to a finite integer; returns undefined for NaN,
// Infinity, or non-integer values (e.g. "abc", "4.5", "").
function safeInt(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

// Safely parse a URL string to a finite number; returns undefined for NaN
// or Infinity (e.g. "abc", "").
function safeNum(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

type Props = { searchParams: Promise<RawParams> };

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;

  const brandParam = str(params.brand);
  const brands     = brandParam ? brandParam.split(",").map((b) => b.trim()).filter(Boolean) : undefined;

  const filters: ProductFilters = {
    category:        str(params.category),
    subcategory:     str(params.subcategory),
    brands,
    search:          str(params.q),
    sortBy:          str(params.sortBy) as SortBy | undefined,
    inStock:         str(params.inStock) === "true" ? true : undefined,
    minPrice:        safeNum(str(params.minPrice)),
    maxPrice:        safeNum(str(params.maxPrice)),
    rating:          safeInt(str(params.rating)),
    discount:        safeInt(str(params.discount)),
    deliveryOptions: str(params.delivery)
                       ? str(params.delivery)!.split(",").map((d) => d.trim())
                           .filter((d): d is DeliveryOption =>
                             ["express", "standard", "collection"].includes(d),
                           )
                       : undefined,
    page:            safeInt(str(params.page))  ?? 1,
    limit:           safeInt(str(params.limit)) ?? 20,
  };

  const [{ products, total, totalPages }, categories, filterMeta] = await Promise.all([
    getProducts(filters),
    getCategories(),
    getFilterMeta(str(params.category)),
  ]);

  const categoryNames   = categories.map((c) => c.name).sort();
  const category        = str(params.category);
  const firstBrand      = brands?.[0];
  const pageTitle       = firstBrand && brands?.length === 1
    ? `${firstBrand} Products`
    : category ? titleCase(category) : "All Products";

  const currentPage  = filters.page  ?? 1;
  const currentLimit = filters.limit ?? 20;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {pageTitle}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {total} {total === 1 ? "product" : "products"}
          {firstBrand && brands?.length === 1 && (
            <span className="ml-1">
              by <span className="font-semibold text-gray-700 dark:text-gray-300">{firstBrand}</span>
            </span>
          )}
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-20" aria-label="Product filters">
          <Suspense fallback={<SidebarSkeleton />}>
            <FiltersSidebar
              categories={categoryNames}
              subcategories={filterMeta.subcategories}
              brands={filterMeta.brands}
            />
          </Suspense>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="lg:hidden">
              <Suspense fallback={null}>
                <MobileFiltersDrawer
                  categories={categoryNames}
                  subcategories={filterMeta.subcategories}
                  brands={filterMeta.brands}
                />
              </Suspense>
            </div>

            <Suspense fallback={<SortSkeleton />}>
              <SortControl />
            </Suspense>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                {total} {total === 1 ? "result" : "results"}
              </span>
              <Suspense fallback={null}>
                <PageSizeSelector currentLimit={currentLimit} />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={null}>
            <ActiveFilters />
          </Suspense>

          <ProductGrid products={products} />

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={total}
                limit={currentLimit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4">
      <div className="h-5 bg-gray-200 rounded w-16" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

function SortSkeleton() {
  return <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />;
}
