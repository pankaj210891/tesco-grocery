import Link from "next/link";
import { Home, Search, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Visual */}
      <div className="relative mb-8">
        <div className="text-[10rem] font-black text-gray-100 dark:text-gray-800 leading-none select-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-[#FCA311] flex items-center justify-center shadow-lg shadow-amber-200 dark:shadow-amber-900/40">
            <ShoppingBag className="h-10 w-10 text-white" aria-hidden />
          </div>
        </div>
      </div>

      <div className="space-y-3 max-w-md mb-10">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100">
          Oops — aisle not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
          The page you&apos;re looking for has moved, been removed, or doesn&apos;t exist.
          Try searching for what you need or head back to the homepage.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FCA311] hover:brightness-105 text-white font-semibold rounded-xl transition-all active:scale-95 text-sm"
        >
          <Home className="h-4 w-4" aria-hidden />
          Back to homepage
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors text-sm"
        >
          <Search className="h-4 w-4" aria-hidden />
          Browse products
        </Link>
      </div>
    </div>
  );
}
