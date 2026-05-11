export default function CheckoutLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Title */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left col */}
        <div className="lg:col-span-7 space-y-6">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right col */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-20" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-14" />
                </div>
              ))}
            </div>
            <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
