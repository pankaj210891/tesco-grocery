import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";

export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6 space-y-2">
        <div className="h-8 bg-gray-200 rounded w-72" />
        <div className="h-4 bg-gray-200 rounded w-28" />
      </div>

      {/* Controls row skeleton */}
      <div className="flex items-center justify-between mb-5">
        <div className="h-8 bg-gray-200 rounded-lg w-40" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>

      {/* Product grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
