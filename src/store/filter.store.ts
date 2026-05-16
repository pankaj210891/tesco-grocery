import { create } from "zustand";
import type { DynamicFilterGroup } from "@/types";

// Holds draft price values typed by the user before they are committed to the URL.
// Price inputs are debounced (600 ms); the URL updates only when BOTH bounds are filled.
// Also caches the brands list fetched from /api/brands so the sidebar can hydrate
// without re-fetching when the user navigates between pages.
// Dynamic filters are cached per category — refetched when category or search changes.

interface FilterDraftState {
  // ── Price draft ──────────────────────────────────────────────────────────────
  draftMinPrice: string;
  draftMaxPrice: string;
  setDraftMinPrice: (v: string) => void;
  setDraftMaxPrice: (v: string) => void;
  syncFromUrl: (min: string | null, max: string | null) => void;
  clearPriceDraft: () => void;

  // ── Brands cache ─────────────────────────────────────────────────────────────
  brands:       string[];
  brandsLoaded: boolean;
  setBrands:    (brands: string[]) => void;

  // ── Dynamic filters cache ─────────────────────────────────────────────────────
  // Keyed by a cache key (category + search + serialized attrs) for instant render
  dynamicFilters:        DynamicFilterGroup[];
  dynamicFiltersLoading: boolean;
  dynamicFiltersCacheKey: string;
  setDynamicFilters:        (filters: DynamicFilterGroup[], cacheKey: string) => void;
  setDynamicFiltersLoading: (loading: boolean) => void;
}

export const useFilterDraftStore = create<FilterDraftState>((set) => ({
  draftMinPrice:    "",
  draftMaxPrice:    "",
  setDraftMinPrice: (v)    => set({ draftMinPrice: v }),
  setDraftMaxPrice: (v)    => set({ draftMaxPrice: v }),
  syncFromUrl:      (min, max) =>
    set({ draftMinPrice: min ?? "", draftMaxPrice: max ?? "" }),
  clearPriceDraft:  ()     => set({ draftMinPrice: "", draftMaxPrice: "" }),

  brands:       [],
  brandsLoaded: false,
  setBrands:    (brands) => set({ brands, brandsLoaded: true }),

  dynamicFilters:          [],
  dynamicFiltersLoading:   false,
  dynamicFiltersCacheKey:  "",
  setDynamicFilters:        (filters, cacheKey) =>
    set({ dynamicFilters: filters, dynamicFiltersCacheKey: cacheKey }),
  setDynamicFiltersLoading: (loading) => set({ dynamicFiltersLoading: loading }),
}));
