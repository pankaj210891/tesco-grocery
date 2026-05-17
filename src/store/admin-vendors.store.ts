import { create } from "zustand";

export interface AdminVendorFilters {
  search:   string;
  status:   string; // "" | "pending" | "active" | "suspended"
  dateFrom: string;
  dateTo:   string;
}

interface AdminVendorsState {
  page:     number;
  filters:  AdminVendorFilters;

  setPage:      (page: number) => void;
  setFilter:    (partial: Partial<AdminVendorFilters>) => void;
  resetFilters: () => void;
}

export const DEFAULT_VENDOR_FILTERS: AdminVendorFilters = {
  search: "", status: "", dateFrom: "", dateTo: "",
};

export const useAdminVendorsStore = create<AdminVendorsState>((set) => ({
  page:    1,
  filters: { ...DEFAULT_VENDOR_FILTERS },

  setPage:      (page)    => set({ page }),
  setFilter:    (partial) => set((s) => ({ filters: { ...s.filters, ...partial }, page: 1 })),
  resetFilters: ()        => set({ filters: { ...DEFAULT_VENDOR_FILTERS }, page: 1 }),
}));
