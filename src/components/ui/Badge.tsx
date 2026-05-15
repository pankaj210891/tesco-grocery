import { cn } from "@/lib/utils/cn";

type BadgeVariant = "sale" | "new" | "bestseller" | "outOfStock";

const variantStyles: Record<BadgeVariant, string> = {
  sale: "bg-[#EE1C2E] text-white",
  new: "bg-[#FCA311] text-white",
  bestseller: "bg-amber-500 text-white",
  outOfStock: "bg-gray-400 text-white",
};

const variantLabels: Record<BadgeVariant, string> = {
  sale: "Sale",
  new: "New",
  bestseller: "Bestseller",
  outOfStock: "Out of Stock",
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export default function Badge({ variant, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide",
        variantStyles[variant],
        className
      )}
    >
      {label ?? variantLabels[variant]}
    </span>
  );
}
