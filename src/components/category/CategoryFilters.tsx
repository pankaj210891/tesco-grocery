"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const PRICE_RANGES = [
  { label: "Under ₹100",    minPrice: "0",   maxPrice: "100" },
  { label: "₹100 – ₹300",  minPrice: "100", maxPrice: "300" },
  { label: "₹300 – ₹600",  minPrice: "300", maxPrice: "600" },
  { label: "Over ₹600",    minPrice: "600", maxPrice: ""    },
];

export default function CategoryFilters() {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  const activeMin = sp.get("minPrice") ?? "";
  const activeMax = sp.get("maxPrice") ?? "";
  const inStock   = sp.get("inStock") === "true";

  function navigate(overrides: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function togglePrice(min: string, max: string) {
    const alreadyActive = activeMin === min && activeMax === max;
    if (alreadyActive) {
      navigate({ minPrice: "", maxPrice: "" });
    } else {
      navigate({ minPrice: min, maxPrice: max });
    }
  }

  function toggleInStock() {
    navigate({ inStock: inStock ? "" : "true" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Price pills */}
      {PRICE_RANGES.map(({ label, minPrice, maxPrice }) => {
        const active = activeMin === minPrice && activeMax === maxPrice;
        return (
          <button
            key={label}
            onClick={() => togglePrice(minPrice, maxPrice)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors",
              active
                ? "bg-[#FCA311] border-[#FCA311] text-white"
                : "bg-white border-gray-300 text-gray-700 hover:border-[#FCA311] hover:text-[#FCA311]"
            )}
          >
            {label}
          </button>
        );
      })}

      {/* In-stock toggle */}
      <button
        onClick={toggleInStock}
        className={cn(
          "px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors",
          inStock
            ? "bg-green-600 border-green-600 text-white"
            : "bg-white border-gray-300 text-gray-700 hover:border-green-600 hover:text-green-600"
        )}
      >
        In stock only
      </button>
    </div>
  );
}
