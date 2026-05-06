export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      {/* Image */}
      <div className="h-44 bg-gray-200" />

      {/* Body */}
      <div className="p-3 space-y-2.5">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />

        {/* Stars */}
        <div className="flex gap-1 pt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-3 bg-gray-200 rounded-sm" />
          ))}
          <div className="h-3 w-8 bg-gray-200 rounded ml-1" />
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 pt-1">
          <div className="h-6 bg-gray-200 rounded w-14" />
          <div className="h-4 bg-gray-200 rounded w-10" />
        </div>

        {/* Button */}
        <div className="h-9 bg-gray-200 rounded-lg mt-1" />
      </div>
    </div>
  );
}
