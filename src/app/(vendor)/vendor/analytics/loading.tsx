export default function VendorAnalyticsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-1.5">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3.5 w-52 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
            <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="h-4 w-36 bg-gray-100 dark:bg-gray-800 rounded mb-5" />
        <div className="h-64 bg-gray-50 dark:bg-gray-800/50 rounded-xl" />
      </div>

      {/* Top products chart + table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="h-4 w-44 bg-gray-100 dark:bg-gray-800 rounded mb-5" />
        <div className="h-48 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
