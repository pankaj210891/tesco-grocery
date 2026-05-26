import Link from "next/link";
import { SearchX, TrendingUp } from "lucide-react";
import { slugify } from "@/lib/utils/format";

const FALLBACK_CATEGORIES = [
  "Fresh Food",
  "Bakery",
  "Dairy & Eggs",
  "Meat & Fish",
  "Drinks",
  "Snacks",
];

const TIPS = [
  "Check your spelling or try different keywords",
  "Use simpler or more general terms",
  "Try searching for a brand name",
  "Browse a category instead",
];

interface NoResultsProps {
  query: string;
  /** Top searched queries from Redis — passed from the server page component. */
  popularSearches?: string[];
}

export default function NoResults({ query, popularSearches = [] }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center text-center py-16 max-w-lg mx-auto">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-5 mb-5">
        <SearchX className="h-12 w-12 text-gray-400 dark:text-gray-500" aria-hidden />
      </div>

      <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-2">
        No results for &ldquo;{query}&rdquo;
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        We couldn&apos;t find anything matching your search. Here are some suggestions:
      </p>

      {/* Tips */}
      <ul className="text-left space-y-1.5 mb-8 w-full max-w-xs">
        {TIPS.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="text-[#FCA311] font-bold mt-0.5 shrink-0">·</span>
            {tip}
          </li>
        ))}
      </ul>

      {/* Popular searches — only shown when the sorted set has data */}
      {popularSearches.length > 0 && (
        <div className="w-full mb-8">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Popular searches
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {popularSearches.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                data-testid="popular-search-term"
                className="px-3 py-1.5 border border-[#FCA311]/40 bg-amber-50 dark:bg-amber-950/20 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-[#FCA311] hover:text-[#FCA311] transition-colors"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Popular categories — fallback when no popular searches are recorded yet */}
      <div className="w-full">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          Browse popular categories
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {FALLBACK_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/products?category=${slugify(cat)}`}
              className="px-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-[#FCA311] hover:text-[#FCA311] transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      <Link
        href="/products"
        className="mt-8 px-6 py-2.5 bg-[#FCA311] text-white font-semibold rounded-xl text-sm hover:bg-[#E8920A] transition-colors"
      >
        Browse All Products
      </Link>
    </div>
  );
}
