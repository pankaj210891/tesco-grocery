export default function CartSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        <div className="h-5 bg-gray-200 rounded w-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items skeleton */}
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 bg-white rounded-xl border border-gray-100 p-4"
            >
              <div className="h-24 w-24 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="flex justify-between mt-3">
                  <div className="h-8 bg-gray-200 rounded-lg w-28" />
                  <div className="h-6 bg-gray-200 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="h-5 bg-gray-200 rounded w-32" />
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-14" />
              </div>
            ))}
          </div>
          <div className="border-t pt-4 flex justify-between">
            <div className="h-5 bg-gray-200 rounded w-12" />
            <div className="h-7 bg-gray-200 rounded w-20" />
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full" />
          <div className="h-10 bg-gray-200 rounded-xl" />
          <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
