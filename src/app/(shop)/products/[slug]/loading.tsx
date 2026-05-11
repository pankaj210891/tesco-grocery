export default function ProductDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="space-y-3">
          <div className="aspect-square w-full bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="flex gap-1 mt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-sm" />
            ))}
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ml-2" />
          </div>
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />
          <div className="flex gap-3 items-baseline">
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-14" />
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
          </div>
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />
          <div className="flex items-center gap-4">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-10" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-36" />
          </div>
          <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
        </div>
      </div>
    </div>
  );
}
