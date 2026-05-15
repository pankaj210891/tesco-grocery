import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const textMap = {
  sm: "text-[11px]",
  md: "text-sm",
  lg: "text-base",
};

export default function RatingStars({
  rating,
  reviewCount,
  size = "md",
  showScore = true,
  className,
}: RatingStarsProps) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Rating: ${rating} out of 5${reviewCount !== undefined ? `, ${reviewCount} reviews` : ""}`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              sizeMap[size],
              i < full
                ? "fill-amber-400 text-amber-400"
                : i === full && hasHalf
                  ? "fill-amber-200 text-amber-400"
                  : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
            )}
            aria-hidden
          />
        ))}
      </div>
      {showScore && (
        <span className={cn(textMap[size], "font-semibold text-gray-700")}>
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className={cn(textMap[size], "text-gray-400 dark:text-gray-500 tabular-nums leading-none")}>
          {reviewCount > 0 ? `(${reviewCount.toLocaleString()})` : "No reviews"}
        </span>
      )}
    </div>
  );
}
