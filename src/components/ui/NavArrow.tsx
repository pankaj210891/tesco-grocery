import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavArrowProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
  /** amber: main carousels | ghost: secondary carousels | overlay: image overlays */
  variant?: "amber" | "ghost" | "overlay";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const variants = {
  amber: {
    base: "border-2 border-[#FCA311] bg-white dark:bg-gray-900 text-[#FCA311] shadow-md",
    enabled: "hover:bg-[#FCA311] hover:text-white",
    disabled: "opacity-30 cursor-not-allowed",
  },
  ghost: {
    base: "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-md",
    enabled: "hover:bg-gray-100 dark:hover:bg-gray-700",
    disabled: "opacity-30 cursor-not-allowed",
  },
  overlay: {
    base: "border border-gray-100 dark:border-transparent bg-white/90 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 shadow-md",
    enabled: "hover:bg-white dark:hover:bg-gray-900 active:scale-90",
    disabled: "opacity-40 cursor-not-allowed",
  },
} as const;

const sizes = {
  sm: "w-7 h-7",
  md: "w-8 h-8",
  lg: "w-9 h-9",
} as const;

export default function NavArrow({
  direction,
  onClick,
  disabled = false,
  variant = "amber",
  size = "md",
  className,
  label,
}: NavArrowProps) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const v = variants[variant];

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      disabled={disabled}
      aria-label={label ?? (direction === "prev" ? "Previous" : "Next")}
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-200",
        sizes[size],
        v.base,
        disabled ? v.disabled : v.enabled,
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
