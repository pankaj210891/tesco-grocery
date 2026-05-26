export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-52 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>

      {/* Two-column tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-gray-100 dark:bg-gray-800 rounded-xl h-72" />
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl h-72" />
      </div>
    </div>
  );
}
