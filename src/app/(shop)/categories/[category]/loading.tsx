import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";

export default function CategoryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 bg-gray-200 rounded w-48 mb-6" />

      {/* Hero skeleton */}
      <div className="rounded-2xl bg-gray-100 p-6 mb-8 flex items-center gap-5">
        <div className="w-16 h-16 bg-gray-200 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-7 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-64" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-5">
        <div className="h-8 bg-gray-200 rounded-lg w-40" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
