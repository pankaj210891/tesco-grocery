import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories } from "@/services/category.service";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Shop by Category",
  description:
    "Browse all grocery categories — fresh food, bakery, dairy, meat, drinks and more.",
};

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          Shop by Category
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Browse our full range across {categories.length} categories
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-gray-400 text-lg">No categories available yet.</p>
          <p className="text-sm text-gray-400 mt-1">Seed the database to get started.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/products?category=${cat.slug}`}
                className={cn(
                  "group flex flex-col items-center text-center p-5 rounded-2xl border transition-colors transition-shadow duration-200",
                  "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md",
                  "dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500",
                  cat.color,
                )}
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                  {cat.emoji}
                </span>
                <span
                  className={cn(
                    "font-bold text-sm leading-tight text-gray-900 dark:text-gray-100",
                    cat.textColor,
                  )}
                >
                  {cat.name}
                </span>
                {cat.productCount > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {cat.productCount} {cat.productCount === 1 ? "product" : "products"}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
