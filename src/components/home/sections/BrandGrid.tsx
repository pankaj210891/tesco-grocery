import Link from "next/link";
import SectionCarousel from "@/components/ui/SectionCarousel";
import type { HomepageSection, SectionItem } from "@/types";

function BrandCard({ item }: { item: SectionItem }) {
  const href = `/products?brand=${encodeURIComponent(item.title)}`;
  return (
    <Link href={href} className="flex-shrink-0 flex flex-col items-center gap-2 w-24 sm:w-28 group">
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl select-none shadow-sm group-hover:shadow-md transition-all duration-150 group-hover:scale-105"
        style={{ backgroundColor: item.color ?? "#F3F4F6" }}
        aria-hidden
      >
        {item.emoji}
      </div>
      <span className="text-[11px] sm:text-xs font-semibold text-center text-gray-700 dark:text-gray-300 leading-tight line-clamp-2 w-full">
        {item.title}
      </span>
    </Link>
  );
}

export default function BrandGrid({ section }: { section: HomepageSection }) {
  return (
    <SectionCarousel
      title={section.title}
      description={section.subtitle}
      seeAllLabel={section.ctaLabel}
      seeAllHref={section.ctaHref}
      titleId={`section-${section.key}`}
    >
      {section.items.map((item) => (
        <BrandCard key={item._id} item={item} />
      ))}
    </SectionCarousel>
  );
}
