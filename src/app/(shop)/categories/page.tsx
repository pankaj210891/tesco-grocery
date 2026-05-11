import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/lib/data/categories";
import { getCategories } from "@/services/product.service";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Shop by Category",
  description: "Browse all grocery categories — fresh food, bakery, dairy, meat, drinks and more.",
};

export default async function CategoriesPage() {
  // Fetch live counts (falls back to mock data if DB not configured)
  const liveCounts = await getCategories();
  const countMap   = Object.fromEntries(liveCounts.map((c) => [c.slug, c.count]));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Shop by Category</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Browse our full range across {CATEGORIES.length} categories
        </p>
      </div>

      {/* Category grid */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {CATEGORIES.map((cat) => {
          const count = countMap[cat.slug];
          return (
            <li key={cat.slug}>
              <Link
                href={`/categories/${cat.slug}`}
                className={cn(
                  "group flex flex-col items-center text-center p-5 rounded-2xl border border-transparent",
                  "hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200",
                  cat.color
                )}
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                  {cat.emoji}
                </span>
                <span className={cn("font-bold text-sm leading-tight dark:text-gray-100", cat.textColor)}>
                  {cat.name}
                </span>
                {count !== undefined && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {count} {count === 1 ? "product" : "products"}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
