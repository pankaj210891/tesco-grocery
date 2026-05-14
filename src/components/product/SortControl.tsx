"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SORT_OPTIONS } from "@/constants";

export default function SortControl() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const current = searchParams.get("sortBy") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sortBy", value);
    } else {
      params.delete("sortBy");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="sort-select"
        className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap hidden sm:inline"
      >
        Sort by:
      </label>
      <select
        id="sort-select"
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311] cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option
            key={opt.value}
            value={opt.value === "relevance" ? "" : opt.value}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
