export default function AdminAnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header + period selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-1.5">
            <div className="h-6 w-44 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3.5 w-64 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        </div>
        <div className="h-9 w-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-8 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
            <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* Area chart */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
        <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
        <div className="h-64 bg-gray-50 dark:bg-gray-800/50 rounded-xl" />
      </div>

      {/* Two charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
            <div className="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
            <div className="h-52 bg-gray-50 dark:bg-gray-800/50 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Horizontal bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
        <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
        <div className="h-48 bg-gray-50 dark:bg-gray-800/50 rounded-xl" />
      </div>
    </div>
  );
}
