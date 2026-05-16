import { create } from "zustand";

// Holds draft price values typed by the user before they are committed to the URL.
// Price inputs are debounced (600 ms); the URL updates only when BOTH bounds are filled.
// Also caches the brands list fetched from /api/brands so the sidebar can hydrate
// without re-fetching when the user navigates between pages.

interface FilterDraftState {
  // ── Price draft ──────────────────────────────────────────────────────────────
  draftMinPrice: string;
  draftMaxPrice: string;
  setDraftMinPrice: (v: string) => void;
  setDraftMaxPrice: (v: string) => void;
  // Sync both draft fields from current URL params (called when URL changes)
  syncFromUrl: (min: string | null, max: string | null) => void;
  // Reset both draft fields to empty (used by clear-all)
  clearPriceDraft: () => void;

  // ── Brands cache ─────────────────────────────────────────────────────────────
  brands:     string[];
  brandsLoaded: boolean;
  setBrands:  (brands: string[]) => void;
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
}));
