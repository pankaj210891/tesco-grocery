import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { RatingSummary } from "@/types";

export default function RatingBreakdown({ summary }: { summary: RatingSummary }) {
  const { average, total, distribution } = summary;

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start">
      {/* Big score */}
      <div className="flex flex-col items-center justify-center shrink-0 w-28">
        <span className="text-5xl font-black text-gray-900 dark:text-gray-100 leading-none">
          {average.toFixed(1)}
        </span>
        <div className="flex gap-0.5 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < Math.round(average)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-gray-200 text-gray-200"
              )}
              aria-hidden
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {total.toLocaleString()} {total === 1 ? "review" : "reviews"}
        </p>
      </div>

      {/* Bars */}
      <div className="flex-1 w-full space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = distribution[star] ?? 0;
          const pct   = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-3">{star}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" aria-hidden />
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
