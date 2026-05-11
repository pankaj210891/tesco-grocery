import Link from "next/link";
import SectionHeader from "./SectionHeader";
import type { HomepageSection, SectionItem } from "@/types";

function CategoryTile({ item }: { item: SectionItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-[#0F4C75]/30 hover:shadow-md transition-all duration-150 group"
      style={{ backgroundColor: item.color ?? "#F9FAFB" }}
    >
      <span
        className="text-3xl leading-none select-none shrink-0 group-hover:scale-110 transition-transform duration-150"
        aria-hidden
      >
        {item.emoji}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-gray-900 leading-tight truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-gray-500 leading-snug mt-0.5 truncate">{item.subtitle}</p>
        )}
      </div>
    </Link>
  );
}

export default function CategoryTiles({ section }: { section: HomepageSection }) {
  return (
    <section aria-labelledby={`section-${section.key}`}>
      <SectionHeader title={section.title} subtitle={section.subtitle} ctaLabel={section.ctaLabel} ctaHref={section.ctaHref} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {section.items.map((item) => (
          <CategoryTile key={item._id} item={item} />
        ))}
      </div>
    </section>
  );
}
