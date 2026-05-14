"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { titleCase } from "@/lib/utils/format";

export default function ActiveFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const chips: { label: string; key: string; extra?: string }[] = [];

  const category = searchParams.get("category");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const inStock = searchParams.get("inStock");
  const q = searchParams.get("q");

  if (q) chips.push({ label: `"${q}"`, key: "q" });
  if (category) chips.push({ label: titleCase(category), key: "category" });
  if (minPrice || maxPrice) {
    const label =
      maxPrice
        ? `₹${minPrice} – ₹${maxPrice}`
        : `Over ₹${minPrice}`;
    chips.push({ label, key: "minPrice", extra: "maxPrice" });
  }
  if (inStock === "true") chips.push({ label: "In Stock", key: "inStock" });

  if (chips.length === 0) return null;

  function remove(key: string, extra?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    if (extra) params.delete(extra);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4" aria-label="Active filters">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#FCA311] text-sm font-medium rounded-full border border-blue-200"
        >
          {chip.label}
          <button
            onClick={() => remove(chip.key, chip.extra)}
            aria-label={`Remove ${chip.label} filter`}
            className="hover:text-[#E8920A] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
