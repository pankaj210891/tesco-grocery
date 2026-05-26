import { create } from "zustand";

export interface AdminListState<F extends Record<string, string>> {
  page:         number;
  filters:      F;
  setPage:      (page: number) => void;
  setFilter:    (partial: Partial<F>) => void;
  resetFilters: () => void;
}

/**
 * Factory for admin list stores that share the same page + filters shape.
 * All three actions (setPage, setFilter, resetFilters) reset page to 1 on
 * filter change to avoid showing an empty page after narrowing results.
 */
export function createAdminStore<F extends Record<string, string>>(
  defaultFilters: F,
) {
  return create<AdminListState<F>>()((set) => ({
    page:    1,
    filters: { ...defaultFilters },

    setPage:      (page)    => set({ page }),
    setFilter:    (partial) => set((s) => ({ filters: { ...s.filters, ...partial }, page: 1 })),
    resetFilters: ()        => set({ filters: { ...defaultFilters }, page: 1 }),
  }));
}
