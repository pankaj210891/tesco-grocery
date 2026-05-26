import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProducts, getCategories, getFilterMeta, getCategoryBreadcrumb } from "@/services/product.service";
import type { BreadcrumbItem } from "@/services/product.service";
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

function safeInt(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

function safeNum(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ── Breadcrumb component ──────────────────────────────────────────────────────

function CategoryBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Category breadcrumb" className="flex items-center flex-wrap gap-1 mb-1">
      <Link
        href="/products"
        className="text-sm text-gray-400 dark:text-gray-500 hover:text-[#FCA311] dark:hover:text-amber-400 transition-colors"
      >
        All Products
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.slug} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 shrink-0" aria-hidden />
            {isLast ? (
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {item.name}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-[#FCA311] dark:hover:text-amber-400 transition-colors"
              >
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

type Props = { searchParams: Promise<RawParams> };

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;

  const brandParam = str(params.brand);
  const brands     = brandParam ? brandParam.split(",").map((b) => b.trim()).filter(Boolean) : undefined;
  const categorySlug = str(params.category);

  const filters: ProductFilters = {
    category:        categorySlug,
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

  // Parse dynamic attribute filters from URL (?attrs={"ram":["8GB"]})
  let attrs: Record<string, string[]> | undefined;
  const attrsRaw = str(params.attrs);
  if (attrsRaw) {
    try {
      const parsed = JSON.parse(attrsRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        attrs = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          const key = k.replace(/[^a-z0-9_]/gi, "");
          if (!key) continue;
          if (Array.isArray(v)) attrs[key] = (v as unknown[]).map(String).filter(Boolean);
          else if (typeof v === "string" && v) attrs[key] = [v];
        }
        if (Object.keys(attrs).length === 0) attrs = undefined;
      }
    } catch { /* malformed — ignore */ }
  }

  const filtersWithAttrs: ProductFilters = { ...filters, attrs };

  const [{ products, total = 0, totalPages = 1 }, categories, filterMeta, breadcrumb] = await Promise.all([
    getProducts(filtersWithAttrs),
    getCategories(),
    getFilterMeta(categorySlug),
    categorySlug ? getCategoryBreadcrumb(categorySlug) : Promise.resolve([]),
  ]);

  const categoryNames = categories.map((c) => c.name).sort();
  const firstBrand    = brands?.[0];

  // Resolved leaf category name — last breadcrumb item (for heading + filter chip)
  const resolvedCategoryName = breadcrumb.length > 0
    ? breadcrumb[breadcrumb.length - 1].name
    : undefined;

  const pageTitle = firstBrand && brands?.length === 1
    ? `${firstBrand} Products`
    : resolvedCategoryName ?? "All Products";

  const currentPage  = filters.page  ?? 1;
  const currentLimit = filters.limit ?? 20;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="mb-6">
        {breadcrumb.length > 0 && <CategoryBreadcrumb items={breadcrumb} />}
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
            <ActiveFilters categoryLabel={resolvedCategoryName} />
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
