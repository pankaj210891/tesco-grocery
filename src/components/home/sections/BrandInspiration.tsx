import Link from "next/link";
import SectionCarousel from "@/components/ui/SectionCarousel";
import type { HomepageSection, SectionItem } from "@/types";

function BrandCard({ item }: { item: SectionItem }) {
  const href = `/products?brand=${encodeURIComponent(item.title)}`;
  return (
    <Link
      href={href}
      className="flex-shrink-0 w-64 sm:w-72 h-48 sm:h-52 rounded-2xl overflow-hidden group relative"
      style={{ backgroundColor: item.color ?? "#1E293B" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div className="absolute top-4 right-5 text-5xl sm:text-6xl select-none leading-none opacity-90" aria-hidden>
        {item.emoji}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Brand Partner</p>
        <h3 className="text-white text-xl sm:text-2xl font-black leading-tight mb-1 line-clamp-2">
          {item.title}
        </h3>
        <p className="text-white/80 text-sm font-medium leading-snug mb-3 line-clamp-1">
          {item.subtitle}
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-sm border border-white/30 group-hover:bg-white/30 transition-colors">
          Explore range →
        </span>
      </div>
    </Link>
  );
}

export default function BrandInspiration({ section }: { section: HomepageSection }) {
  return (
    <SectionCarousel
      title={section.title}
      description={section.subtitle}
      seeAllLabel={section.ctaLabel}
      seeAllHref={section.ctaHref}
      titleId={`section-${section.key}`}
      showArrows={false}
    >
      {section.items.map((item) => (
        <BrandCard key={item._id} item={item} />
      ))}
    </SectionCarousel>
  );
}
