import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface MiniBannerCardProps {
  href:       string;
  label:      string;
  title:      string;
  cta?:       string;
  code?:      string;
  emoji?:     string;
  bg:         string;
  textColor:  string;
  btnColor:   string;
  onClick?:   () => void;
  /** "sm" = compact (mega-panel), "lg" = tall (hero sidebar). Defaults to "sm". */
  size?:      "sm" | "lg";
  className?: string;
  "data-testid"?: string;
}

export default function MiniBannerCard({
  href,
  label,
  title,
  cta = "Shop Now",
  code,
  emoji = "🎉",
  bg,
  textColor,
  btnColor,
  onClick,
  size = "sm",
  className,
  "data-testid": testId,
}: MiniBannerCardProps) {
  const lg = size === "lg";

  return (
    <Link
      href={href}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-gradient-to-br flex flex-col justify-between",
        "border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow duration-200",
        lg ? "p-6" : "p-5 min-h-[110px]",
        bg,
        className,
      )}
    >
      <div>
        <span className={cn(lg ? "text-xs" : "text-[10px]", "font-black uppercase tracking-widest", textColor)}>
          {label}
        </span>
        <h3 className={cn(lg ? "text-lg" : "text-sm", "font-black leading-tight mt-0.5 pr-12", textColor)}>
          {title}
        </h3>
        {code && (
          <span className={cn(
            "inline-block mt-1 text-[10px] font-mono font-bold bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded",
            textColor,
          )}>
            {code}
          </span>
        )}
        <span className={cn(
          "flex items-center gap-1 font-semibold mt-2 hover:underline",
          lg ? "text-xs" : "text-[11px]",
          btnColor,
        )}>
          {cta} <ArrowRight className="h-3 w-3" />
        </span>
      </div>
      <div
        className={cn(
          "absolute right-4 bottom-4 select-none group-hover:scale-110 transition-transform duration-300",
          lg ? "text-5xl" : "text-4xl",
        )}
        aria-hidden
      >
        {emoji}
      </div>
    </Link>
  );
}
