import Link from "next/link";
import SectionHeader from "./SectionHeader";
import type { HomepageSection, SectionItem } from "@/types";

function InfoCard({ item }: { item: SectionItem }) {
  return (
    <Link
      href={item.href}
      className="flex flex-col items-center text-center p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-colors transition-shadow duration-150 group"
    >
      {/* Emoji circle */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-3 select-none group-hover:scale-110 transition-transform duration-150"
        style={{ backgroundColor: item.color ?? "#F3F4F6" }}
        aria-hidden
      >
        {item.emoji}
      </div>

      <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-1 leading-tight">
        {item.title}
      </h3>
      {item.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
          {item.description}
        </p>
      )}
    </Link>
  );
}

export default function InfoCards({ section }: { section: HomepageSection }) {
  return (
    <section aria-labelledby={`section-${section.key}`}>
      <SectionHeader title={section.title} subtitle={section.subtitle} ctaLabel={section.ctaLabel} ctaHref={section.ctaHref} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {section.items.map((item) => (
          <InfoCard key={item._id} item={item} />
        ))}
      </div>
    </section>
  );
}
