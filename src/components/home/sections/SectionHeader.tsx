import Link from "next/link";

interface SectionHeaderProps {
  title:     string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?:  string;
}

export default function SectionHeader({ title, subtitle, ctaLabel, ctaHref }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="shrink-0 text-sm font-semibold text-[#0F4C75] dark:text-blue-400 hover:underline mt-1"
        >
          {ctaLabel} →
        </Link>
      )}
    </div>
  );
}
