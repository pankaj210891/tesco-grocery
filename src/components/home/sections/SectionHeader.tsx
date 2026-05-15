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
  title, subtitle, ctaLabel, ctaHref,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>

      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="shrink-0 group flex items-center gap-1 text-sm font-bold transition-colors mt-1 hover:underline"
          style={{ color: "#FCA311" }}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
