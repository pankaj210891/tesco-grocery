import Link from "next/link";
import SectionHeader from "./SectionHeader";
import type { HomepageSection, SectionItem } from "@/types";

function ExploreCard({ item }: { item: SectionItem }) {
  return (
    <Link
      href={item.href}
      className="relative flex flex-col justify-between p-5 rounded-2xl overflow-hidden min-h-[130px] sm:min-h-[150px] hover:shadow-lg transition-shadow duration-150 group border border-black/5"
      style={{ backgroundColor: item.color ?? "#F3F4F6" }}
    >
      <div>
        <span className="text-4xl leading-none select-none group-hover:scale-110 transition-transform duration-150 inline-block" aria-hidden>
          {item.emoji}
        </span>
      </div>
      <div className="mt-3">
        <h3 className="text-sm sm:text-base font-black text-gray-900 leading-tight">
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.subtitle}</p>
        )}
      </div>
    </Link>
  );
}

export default function ExploreCards({ section }: { section: HomepageSection }) {
  return (
    <section aria-labelledby={`section-${section.key}`}>
      <SectionHeader title={section.title} subtitle={section.subtitle} ctaLabel={section.ctaLabel} ctaHref={section.ctaHref} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {section.items.map((item) => (
          <ExploreCard key={item._id} item={item} />
        ))}
      </div>
    </section>
  );
}
