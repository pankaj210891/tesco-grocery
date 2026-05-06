import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";

export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header skeleton */}
      <div className="mb-6 space-y-2 animate-pulse">
        <div className="h-7 bg-gray-200 rounded w-44" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>

      <div className="flex gap-6">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="space-y-5 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-16" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 rounded w-full" />
            ))}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-12" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded w-3/4" />
              ))}
            </div>
          </div>
        </aside>

        {/* Grid skeleton */}
        <div className="flex-1 min-w-0">
          {/* Controls row skeleton */}
          <div className="flex items-center gap-3 mb-5 animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-24 lg:hidden" />
            <div className="h-8 bg-gray-200 rounded-lg w-40" />
            <div className="ml-auto h-4 bg-gray-200 rounded w-20 hidden sm:block" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
