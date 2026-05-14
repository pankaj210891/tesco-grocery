"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PAGE_SIZES = [10, 20, 50, 100] as const;

export default function PageSizeSelector({ currentLimit }: { currentLimit: number }) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params);
    next.set("limit", e.target.value);
    next.delete("page"); // reset to page 1 when page size changes
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="page-size" className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
        Show
      </label>
      <select
        id="page-size"
        value={currentLimit}
        onChange={handleChange}
        className="h-8 px-2 pr-7 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#FCA311] appearance-none cursor-pointer"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
      >
        {PAGE_SIZES.map((s) => (
          <option key={s} value={s}>{s} items</option>
        ))}
      </select>
    </div>
  );
}
