import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title:     string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?:  string;
  accent?:   string;
}

export default function SectionHeader({
  title, subtitle, ctaLabel, ctaHref, accent = "#0F4C75",
}: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        <div
          className="w-1 rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: accent, height: subtitle ? "3rem" : "1.75rem" }}
          aria-hidden
        />
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>

      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="shrink-0 group flex items-center gap-1 text-sm font-bold text-[#0F4C75] dark:text-blue-400 transition-all mt-1 hover:underline"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
