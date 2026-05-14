export default function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden animate-pulse">
      {/* Square image placeholder */}
      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700/60" />

      {/* Body */}
      <div className="p-3.5 space-y-2.5">
        {/* Category */}
        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
        {/* Name */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-full" />
          <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-4/5" />
        </div>
        {/* Brand */}
        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-1/4" />
        {/* Stars */}
        <div className="flex gap-0.5 items-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-3 bg-gray-100 dark:bg-gray-700 rounded-sm" />
          ))}
          <div className="h-2.5 w-8 bg-gray-100 dark:bg-gray-700 rounded ml-1" />
        </div>
        {/* Price */}
        <div className="flex items-baseline gap-2 pt-1">
          <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-16" />
          <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-10" />
        </div>
        {/* Button */}
        <div className="h-9 bg-gray-100 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  );
}
