"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, Tag, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useScrollLock } from "@/hooks/useScrollLock";
import { apiClient } from "@/lib/axios";

const AMBER = "#FCA311";

type SuggestionCategory = { _id: string; name: string; slug: string; emoji: string };
type SuggestionProduct  = { _id: string; name: string; slug: string; image: string; price: number; category: string; brand: string };

type Suggestions = {
  categories: SuggestionCategory[];
  products:   SuggestionProduct[];
  brands:     string[];
};

const EMPTY: Suggestions = { categories: [], products: [], brands: [] };

function hasSuggestions(s: Suggestions) {
  return s.categories.length > 0 || s.products.length > 0 || s.brands.length > 0;
}

interface SearchBarProps {
  mobile?:    boolean;
  onSearch?:  () => void;
}

export default function SearchBar({ mobile = false, onSearch }: SearchBarProps) {
  const [query,        setQuery]        = useState("");
  const [suggestions,  setSuggestions]  = useState<Suggestions>(EMPTY);
  const [open,         setOpen]         = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [noResults,    setNoResults]    = useState(false);
  const [activeIdx,    setActiveIdx]    = useState(-1);

  const router       = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AbortController ref — cancels the in-flight fetch when a new keystroke fires
  // before the previous response arrives, preventing stale suggestions overriding fresh ones.
  const abortRef     = useRef<AbortController | null>(null);

  useScrollLock(open);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q || q.length < 2) {
      setSuggestions(EMPTY);
      setNoResults(false);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request before starting a new one
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const res = await apiClient.get<{ success: boolean; data: Suggestions }>(
          `/api/search/suggestions?q=${encodeURIComponent(q)}`,
          { signal: abortRef.current.signal },
        );
        const json = res.data;
        if (json.success) {
          if (hasSuggestions(json.data)) {
            setSuggestions(json.data);
            setNoResults(false);
            setOpen(true);
          } else {
            setSuggestions(EMPTY);
            setNoResults(true);
            setOpen(true);
          }
        }
      } catch (err: unknown) {
        // Ignore abort errors — they are expected when typing fast
        if (err instanceof Error && err.name === "CanceledError") return;
        setSuggestions(EMPTY);
        setNoResults(false);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    fetchSuggestions(val);
  }

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    setSuggestions(EMPTY);
    setNoResults(false);
    onSearch?.();
    router.push(href);
  }

  // Fire-and-forget analytics click event
  function trackClick(productId: string, position: number) {
    if (!query.trim()) return;
    void apiClient
      .post("/api/search/analytics", { query: query.trim(), productId, position })
      .catch(() => {/* swallow — analytics must never block UX */});
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  // Build flat list of navigable items for keyboard nav
  const allItems: Array<{ href: string; label: string }> = [
    ...suggestions.categories.map((c) => ({
      href:  `/products?category=${c.slug}`,
      label: c.name,
    })),
    ...suggestions.brands.map((b) => ({
      href:  `/search?q=${encodeURIComponent(b)}`,
      label: b,
    })),
    ...suggestions.products.map((p) => ({
      href:  `/products/${p.slug}`,
      label: p.name,
    })),
  ];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      navigate(allItems[activeIdx].href);
    }
  }

  const inputCls = mobile
    ? "flex-1 min-w-0 h-full pl-4 pr-2 text-base bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
    : "flex-1 min-w-0 h-full pl-4 pr-2 text-base md:text-sm text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-none";

  // Shared index offset helpers
  const catStart   = 0;
  const brandStart = suggestions.categories.length;
  const prodStart  = brandStart + suggestions.brands.length;

  return (
    <div ref={containerRef} className={cn("relative", mobile ? "w-full" : "flex-1 max-w-2xl mx-4")}>
      <form onSubmit={handleSubmit} role="search">
        <div
          className={cn(
            "flex items-center w-full h-11 rounded-xl overflow-hidden",
            "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
            "focus-within:border-[#FCA311] focus-within:ring-2 focus-within:ring-[#FCA311]/20 transition-colors",
          )}
        >
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && (hasSuggestions(suggestions) || noResults) && setOpen(true)}
            placeholder={mobile ? "Search products…" : "Search for products, brands and more…"}
            role="combobox"
            aria-label="Search products"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="search-suggestions-listbox"
            autoComplete="off"
            data-testid="search-input"
            className={inputCls}
          />

          {query && (
            <button
              type="button"
              aria-label="Clear search"
              data-testid="search-clear"
              onClick={() => {
                setQuery("");
                setSuggestions(EMPTY);
                setNoResults(false);
                setOpen(false);
              }}
              className="shrink-0 flex items-center justify-center w-8 h-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {loading && (
            <span className="shrink-0 flex items-center justify-center w-8 h-full">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-[#FCA311] rounded-full animate-spin" />
            </span>
          )}

          <button
            type="submit"
            aria-label="Submit search"
            data-testid="search-submit"
            className="shrink-0 flex items-center justify-center w-12 h-full text-white rounded-r-xl transition-colors hover:brightness-105 active:scale-95"
            style={{ backgroundColor: AMBER }}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {open && (
        <div
          id="search-suggestions-listbox"
          role="listbox"
          aria-label="Search suggestions"
          data-testid="search-suggestions"
          className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[60] overflow-hidden max-h-[420px] overflow-y-auto"
        >
          {/* No-results state — shown instead of empty dropdown closing silently */}
          {noResults && (
            <div className="px-4 py-5 text-center" data-testid="search-no-results">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No results for &ldquo;<span className="text-[#FCA311]">{query}</span>&rdquo;
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Try different keywords or check your spelling
              </p>
              <button
                onMouseDown={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
                className="mt-3 text-xs font-semibold underline underline-offset-2"
                style={{ color: AMBER }}
              >
                Search anyway
              </button>
            </div>
          )}

          {/* Categories */}
          {suggestions.categories.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Categories
              </p>
              {suggestions.categories.map((cat, i) => {
                const idx = catStart + i;
                return (
                  <button
                    key={cat._id}
                    role="option"
                    aria-selected={activeIdx === idx}
                    data-testid="suggestion-category"
                    onMouseDown={() => navigate(`/products?category=${cat.slug}`)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors",
                      activeIdx === idx
                        ? "bg-amber-50 dark:bg-amber-950/30 text-[#FCA311]"
                        : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                  >
                    <span className="text-xl leading-none shrink-0">{cat.emoji}</span>
                    <span className="flex-1 font-medium">{cat.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">Browse category</span>
                  </button>
                );
              })}
            </section>
          )}

          {/* Brands */}
          {suggestions.brands.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Brands
              </p>
              {suggestions.brands.map((brand, i) => {
                const idx = brandStart + i;
                return (
                  <button
                    key={brand}
                    role="option"
                    aria-selected={activeIdx === idx}
                    data-testid="suggestion-brand"
                    onMouseDown={() => navigate(`/search?q=${encodeURIComponent(brand)}`)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors",
                      activeIdx === idx
                        ? "bg-amber-50 dark:bg-amber-950/30 text-[#FCA311]"
                        : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                  >
                    <Tag className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="flex-1 font-medium">{brand}</span>
                  </button>
                );
              })}
            </section>
          )}

          {/* Products */}
          {suggestions.products.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Products
              </p>
              {suggestions.products.map((product, i) => {
                const idx = prodStart + i;
                return (
                  <button
                    key={product._id}
                    role="option"
                    aria-selected={activeIdx === idx}
                    data-testid="suggestion-product"
                    onMouseDown={() => {
                      trackClick(product._id, i);
                      navigate(`/products/${product.slug}`);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors",
                      activeIdx === idx
                        ? "bg-amber-50 dark:bg-amber-950/30"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                  >
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{product.brand} · {product.category}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold" style={{ color: AMBER }}>
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                  </button>
                );
              })}
            </section>
          )}

          {/* See all results footer — only shown when we have suggestions */}
          {hasSuggestions(suggestions) && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              <button
                onMouseDown={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
                data-testid="search-see-all"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                style={{ color: AMBER }}
              >
                <TrendingUp className="h-4 w-4" />
                See all results for &ldquo;{query}&rdquo;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
