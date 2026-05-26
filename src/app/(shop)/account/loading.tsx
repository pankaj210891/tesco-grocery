export default function AccountLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Page heading */}
      <div className="space-y-1.5 mb-8">
        <div className="h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-52 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar nav */}
        <aside className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          ))}
        </aside>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Profile card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3.5 w-48 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>

          {/* Recent orders */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-2.5 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
                  </div>
                  <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
