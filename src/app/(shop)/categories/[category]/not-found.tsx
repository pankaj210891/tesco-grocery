import Link from "next/link";
import { SearchX } from "lucide-react";

export default function CategoryNotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="inline-flex bg-gray-100 rounded-full p-5 mb-5">
        <SearchX className="h-12 w-12 text-gray-400" aria-hidden />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Category not found</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
        We couldn&apos;t find that category. It may have been moved or renamed.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/categories"
          className="px-6 py-2.5 bg-[#FCA311] text-white font-semibold rounded-xl text-sm hover:bg-[#E8920A] transition-colors"
        >
          Browse all categories
        </Link>
        <Link
          href="/products"
          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl text-sm hover:border-gray-400 transition-colors"
        >
          All products
        </Link>
      </div>
    </div>
  );
}
