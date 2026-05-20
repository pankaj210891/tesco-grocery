import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import SectionCarousel from "@/components/ui/SectionCarousel";
import type { Category } from "@/types";

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <SectionCarousel
      title="Category"
      seeAllLabel="View All Categories"
      seeAllHref="/categories"
      titleId="dept-heading"
    >
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/products?category=${cat.slug}`}
          className={cn(
            "flex-shrink-0 flex flex-col items-center gap-2.5 p-3 sm:p-4 rounded-2xl",
            "w-[88px] sm:w-[100px]",
            "bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700",
            "shadow-sm hover:shadow-md hover:border-[#FCA311] dark:hover:border-[#FCA311]",
            "transition-colors transition-shadow duration-200 group",
          )}
        >
          <div
            className={cn(
              "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center",
              "text-2xl sm:text-3xl leading-none select-none",
              "transition-transform duration-150 group-hover:scale-110",
              cat.color,
              "dark:bg-gray-700/60",
            )}
          >
            {cat.emoji}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight text-gray-700 dark:text-gray-300 line-clamp-2 w-full group-hover:text-[#FCA311] transition-colors">
            {cat.name}
          </span>
        </Link>
      ))}
    </SectionCarousel>
  );
}
