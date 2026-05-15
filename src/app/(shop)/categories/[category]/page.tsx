import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { ChevronRight } from "lucide-react";
import { getAllCategories, getCategoryBySlug } from "@/services/category.service";
import { getProducts } from "@/services/product.service";
import { cn } from "@/lib/utils/cn";
import type { ProductFilters } from "@/types";
import ProductGrid from "@/components/product/ProductGrid";
import SortControl from "@/components/product/SortControl";
import CategoryFilters from "@/components/category/CategoryFilters";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  params:       Promise<{ category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// ── Static generation ─────────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const categories = await getAllCategories();
    return categories.map((c) => ({ category: c.slug }));
  } catch {
    return [];
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const meta = await getCategoryBySlug(category);
  if (!meta) return { title: "Category Not Found" };

  return {
    title:       `${meta.name} — ${siteConfig.name}`,
    description: meta.description,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const sp           = await searchParams;

  const meta = await getCategoryBySlug(category);
  if (!meta) notFound();

  const filters: ProductFilters = {
    category,
    sortBy:   str(sp.sortBy)   as ProductFilters["sortBy"] | undefined,
    inStock:  str(sp.inStock) === "true" ? true : undefined,
    minPrice: str(sp.minPrice) ? Number(str(sp.minPrice)) : undefined,
    maxPrice: str(sp.maxPrice) && str(sp.maxPrice) !== ""
                ? Number(str(sp.maxPrice))
                : undefined,
  };

  const { products, total } = await getProducts(filters);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
          <li><Link href="/" className="hover:text-[#FCA311] transition-colors">Home</Link></li>
          <li><ChevronRight className="h-3.5 w-3.5 text-gray-300" /></li>
          <li><Link href="/categories" className="hover:text-[#FCA311] transition-colors">Categories</Link></li>
          <li><ChevronRight className="h-3.5 w-3.5 text-gray-300" /></li>
          <li className="font-semibold text-gray-900 dark:text-gray-100">{meta.name}</li>
        </ol>
      </nav>

      {/* Category hero */}
      <div className={cn("rounded-2xl p-5 sm:p-7 mb-8 flex items-center gap-4 sm:gap-6", meta.color)}>
        <div className={cn(
          "w-14 h-14 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shrink-0",
          "bg-white shadow-sm"
        )}>
          {meta.emoji}
        </div>
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-black", meta.textColor)}>{meta.name}</h1>
          <p className="text-sm text-gray-600 mt-0.5 max-w-xl">{meta.description}</p>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Suspense fallback={null}>
          <CategoryFilters />
        </Suspense>

        <Suspense fallback={<SortSkeleton />}>
          <SortControl />
        </Suspense>

        <span className="ml-auto text-sm text-gray-500 hidden sm:inline">
          {total} {total === 1 ? "product" : "products"}
        </span>
      </div>

      {/* Results */}
      {products.length === 0 ? (
        <EmptyCategory name={meta.name} />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyCategory({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center text-center py-20">
      <p className="text-gray-400 text-lg mb-2">No products in {name} yet</p>
      <Link
        href="/products"
        className="mt-4 px-6 py-2.5 bg-[#FCA311] text-white font-semibold rounded-xl text-sm hover:bg-[#E8920A] transition-colors"
      >
        Browse all products
      </Link>
    </div>
  );
}

function SortSkeleton() {
  return <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />;
}
