"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Clock, ArrowRight, X, Command } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQuickNav } from "@/hooks/useQuickNav";
import { useAuthStore } from "@/store/auth.store";
import { useDebounce } from "@/hooks/useDebounce";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  getNavItemsForRole,
  type QuickNavItem,
  type QuickNavRole,
} from "@/config/quick-nav-items";

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveRole(role: string | undefined): QuickNavRole {
  if (role === "admin")    return "admin";
  if (role === "vendor")   return "vendor";
  if (role === "customer") return "customer";
  return "guest";
}

function matchesQuery(item: QuickNavItem, q: string): boolean {
  const lower = q.toLowerCase();
  if (item.label.toLowerCase().includes(lower))          return true;
  if (item.href.toLowerCase().includes(lower))           return true;
  if (item.group.toLowerCase().includes(lower))          return true;
  if (item.keywords?.some((k) => k.toLowerCase().includes(lower))) return true;
  return false;
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

// ── Result item ───────────────────────────────────────────────────────────────

interface ResultItemProps {
  item:      QuickNavItem;
  active:    boolean;
  onSelect:  (item: QuickNavItem) => void;
  id:        string;
}

function ResultItem({ item, active, onSelect, id }: ResultItemProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <button
      ref={ref}
      id={id}
      role="option"
      aria-selected={active}
      onClick={() => onSelect(item)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
        active
          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60",
      )}
    >
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-amber-500" : "text-gray-400 dark:text-gray-500",
        )}
        aria-hidden
      />
      <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
      <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono truncate hidden sm:block">
        {item.href}
      </span>
      <ArrowRight
        className={cn(
          "h-3.5 w-3.5 shrink-0 transition-opacity",
          active ? "opacity-60" : "opacity-0",
        )}
        aria-hidden
      />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuickNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const {
    open, query, recentHrefs,
    setOpen, setQuery, pushRecent,
  } = useQuickNav();

  useScrollLock(open);

  const debouncedQuery = useDebounce(query, 120);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const role = resolveRole(user?.role);

  // ── Compute visible items ─────────────────────────────────────────────────

  const filteredItems = useMemo<QuickNavItem[]>(() => {
    const allowed = getNavItemsForRole(role);

    if (!debouncedQuery.trim()) {
      // Show recently visited pages first, then fill from allowed items
      const recentItems = recentHrefs
        .map((href) => allowed.find((i) => i.href === href))
        .filter((i): i is QuickNavItem => i !== undefined);

      const remaining = allowed
        .filter((i) => !recentHrefs.includes(i.href))
        .slice(0, 8);

      return [...recentItems, ...remaining];
    }

    return allowed.filter((item) => matchesQuery(item, debouncedQuery));
  }, [debouncedQuery, role, recentHrefs]);

  const grouped = useMemo(
    () => groupBy(filteredItems, (i) => i.group),
    [filteredItems],
  );

  const flatList = useMemo(
    () => Array.from(grouped.values()).flat(),
    [grouped],
  );

  // Reset cursor whenever results change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActiveIdx(0); }, [filteredItems]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname, setOpen]);

  // ── Global CMD+K / Ctrl+K listener ───────────────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        // Allow override even when in search input (but not other inputs)
        if (inInput && target !== inputRef.current) return;
        e.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  // ── Keyboard navigation inside palette ───────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatList[activeIdx];
        if (item) handleSelect(item);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatList, activeIdx],
  );

  function handleSelect(item: QuickNavItem) {
    pushRecent(item.href);
    setOpen(false);
    router.push(item.href);
  }

  if (!open) return null;

  const isShowingRecent = !debouncedQuery.trim() && recentHrefs.length > 0;
  const activeItemId = flatList[activeIdx] ? `qn-item-${flatList[activeIdx].href.replace(/\//g, "-")}` : undefined;

  return (
    // Overlay backdrop
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

      {/* Palette panel */}
      <div
        role="dialog"
        aria-label="Quick Navigation"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="qn-listbox"
            aria-activedescendant={activeItemId}
            aria-expanded={flatList.length > 0}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and sections…"
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 dark:text-gray-500 rounded border border-gray-200 dark:border-gray-700 leading-none">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          id="qn-listbox"
          ref={listboxRef}
          role="listbox"
          aria-label="Navigation results"
          className="overflow-y-auto max-h-[min(380px,60vh)] py-2 px-2"
        >
          {flatList.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <Search className="h-8 w-8 text-gray-300 dark:text-gray-700" aria-hidden />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No results for <span className="font-semibold">&ldquo;{query}&rdquo;</span>
              </p>
            </div>
          ) : (
            <>
              {isShowingRecent && (
                <div className="flex items-center gap-1.5 px-3 mb-1">
                  <Clock className="h-3 w-3 text-gray-400" aria-hidden />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600">
                    Recent
                  </span>
                </div>
              )}

              {Array.from(grouped.entries()).map(([groupName, items]) => {
                // Only show the group heading when there are multiple groups visible
                const showGroupLabel = grouped.size > 1 && !isShowingRecent;
                return (
                  <div key={groupName} className="mb-1">
                    {showGroupLabel && (
                      <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600">
                        {groupName}
                      </p>
                    )}
                    {items.map((item) => {
                      const flatIdx = flatList.indexOf(item);
                      return (
                        <ResultItem
                          key={item.href}
                          id={`qn-item-${item.href.replace(/\//g, "-")}`}
                          item={item}
                          active={flatIdx === activeIdx}
                          onSelect={handleSelect}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-600">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono">↵</kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono">Esc</kbd>
              close
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-600 font-mono">
            <Command className="h-3 w-3" aria-hidden />K
          </div>
        </div>
      </div>
    </div>
  );
}
