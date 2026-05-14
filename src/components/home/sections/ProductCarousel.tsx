import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import SectionCarousel from "@/components/ui/SectionCarousel";
import { formatPrice } from "@/lib/utils/format";
import type { HomepageSection, SectionItem } from "@/types";

const AMBER = "#FCA311";

function CarouselItem({ item }: { item: SectionItem }) {
  const href = item.productSlug ? `/products/${item.productSlug}` : (item.href ?? "/products");
  return (
    <Link
      href={href}
      className="flex-shrink-0 w-40 sm:w-44 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/70 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
    >
      {/* Image area */}
      <div className="h-36 sm:h-40 flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-gray-700/30">
        <span className="text-5xl sm:text-6xl select-none leading-none group-hover:scale-110 transition-transform duration-300" aria-hidden>
          {item.emoji ?? "📦"}
        </span>
        {item.badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-black rounded bg-[#25A244] text-white uppercase">
            {item.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-1">
        {item.brand && (
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
            {item.brand}
          </p>
        )}
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-[#FCA311] transition-colors">
          {item.title}
        </p>
        {item.price != null && (
          <p className="text-sm font-black text-gray-900 dark:text-white pt-0.5">
            {formatPrice(item.price)}
          </p>
        )}
        <div className="flex items-center justify-end pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: AMBER }}>
            <ShoppingCart className="h-3 w-3" aria-hidden />
            Add
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ProductCarousel({ section }: { section: HomepageSection }) {
  return (
    <SectionCarousel
      title={section.title}
      description={section.subtitle}
      seeAllLabel={section.ctaLabel}
      seeAllHref={section.ctaHref}
      titleId={`section-${section.key}`}
    >
      {section.items.map((item) => (
        <CarouselItem key={item._id} item={item} />
      ))}
    </SectionCarousel>
  );
}
