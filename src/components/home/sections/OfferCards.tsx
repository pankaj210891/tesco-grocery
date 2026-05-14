import Link from "next/link";
import SectionCarousel from "@/components/ui/SectionCarousel";
import { formatPrice } from "@/lib/utils/format";
import type { HomepageSection, SectionItem } from "@/types";

function daysLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function OfferCard({ item }: { item: SectionItem }) {
  const days = daysLeft(item.expiresAt);
  const expiry =
    days === null  ? null :
    days <= 0      ? "Offer expired" :
    days === 1     ? "⏰ Ends tomorrow" :
                     `⏰ Ends in ${days} days`;
  const href = item.productSlug ? `/products/${item.productSlug}` : (item.href ?? "/offers");

  return (
    <Link
      href={href}
      className="flex-shrink-0 w-40 sm:w-44 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/70 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
    >
      <div
        className="h-36 sm:h-40 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: item.color ?? "#F9FAFB" }}
      >
        <span className="text-5xl sm:text-6xl select-none leading-none group-hover:scale-110 transition-transform duration-300" aria-hidden>
          {item.emoji ?? "📦"}
        </span>
        {item.discount && (
          <span className="absolute top-2 right-2 px-2 py-1 text-[11px] font-black rounded-xl bg-red-500 text-white shadow-sm">
            -{item.discount}%
          </span>
        )}
      </div>

      <div className="p-3 space-y-0.5">
        {item.brand && (
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
            {item.brand}
          </p>
        )}
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2 min-h-[2.5rem]">
          {item.title}
        </p>
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          {item.price != null && (
            <span className="text-sm font-black text-red-600 dark:text-red-400">
              {formatPrice(item.price)}
            </span>
          )}
          {item.originalPrice != null && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(item.originalPrice)}
            </span>
          )}
        </div>
        {expiry && (
          <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 pt-0.5">
            {expiry}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function OfferCards({ section }: { section: HomepageSection }) {
  return (
    <SectionCarousel
      title={section.title}
      description={section.subtitle}
      seeAllLabel={section.ctaLabel}
      seeAllHref={section.ctaHref}
      titleId={`section-${section.key}`}
    >
      {section.items.map((item) => (
        <OfferCard key={item._id} item={item} />
      ))}
    </SectionCarousel>
  );
}
