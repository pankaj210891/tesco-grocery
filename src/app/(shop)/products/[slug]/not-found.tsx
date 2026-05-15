import Link from "next/link";
import { PackageX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center text-center">
      <PackageX className="h-20 w-20 text-gray-300 mb-6" aria-hidden />

      <h1 className="text-2xl font-black text-gray-900 mb-2">
        Product Not Found
      </h1>
      <p className="text-gray-500 max-w-md mb-8">
        The product you&apos;re looking for doesn&apos;t exist or may have been
        removed from our store.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/products"
          className="px-6 py-2.5 bg-[#FCA311] text-white rounded-xl font-semibold text-sm hover:bg-[#E8920A] transition-colors"
        >
          Browse All Products
        </Link>
        <Link
          href="/"
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:border-gray-400 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
