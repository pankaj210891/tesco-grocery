import Link from "next/link";
import { SearchX } from "lucide-react";
import { slugify } from "@/lib/utils/format";

const POPULAR_CATEGORIES = [
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
}

export default function NoResults({ query }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center text-center py-16 max-w-lg mx-auto">
      <div className="bg-gray-100 rounded-full p-5 mb-5">
        <SearchX className="h-12 w-12 text-gray-400" aria-hidden />
      </div>

      <h2 className="text-xl font-black text-gray-800 mb-2">
        No results for &ldquo;{query}&rdquo;
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        We couldn&apos;t find anything matching your search. Here are some
        suggestions:
      </p>

      {/* Tips */}
      <ul className="text-left space-y-1.5 mb-8 w-full max-w-xs">
        {TIPS.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-[#00539F] font-bold mt-0.5 shrink-0">·</span>
            {tip}
          </li>
        ))}
      </ul>

      {/* Popular categories */}
      <div className="w-full">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Browse popular categories
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/categories/${slugify(cat)}`}
              className="px-4 py-1.5 border border-gray-200 rounded-full text-sm text-gray-700 hover:border-[#00539F] hover:text-[#00539F] transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      <Link
        href="/products"
        className="mt-8 px-6 py-2.5 bg-[#00539F] text-white font-semibold rounded-xl text-sm hover:bg-[#003B7A] transition-colors"
      >
        Browse All Products
      </Link>
    </div>
  );
}
