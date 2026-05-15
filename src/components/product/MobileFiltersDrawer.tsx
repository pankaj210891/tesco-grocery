"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import FiltersSidebar from "@/components/product/FiltersSidebar";
import { useScrollLock } from "@/hooks/useScrollLock";

interface MobileFiltersDrawerProps {
  categories: string[];
}

export default function MobileFiltersDrawer({
  categories,
}: MobileFiltersDrawerProps) {
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600",
          "text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
          "hover:border-[#FCA311] hover:text-[#FCA311] transition-colors"
        )}
        aria-expanded={open}
        aria-label="Open filters"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal
          aria-label="Product filters"
        >
          {/* Dimmed overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Filters</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable filter content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FiltersSidebar categories={categories} />
            </div>

            {/* Apply footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2.5 bg-[#FCA311] text-white rounded-xl font-semibold text-sm hover:bg-[#E8920A] transition-colors"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
