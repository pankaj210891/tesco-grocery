import { create } from "zustand";

export interface AdminProductFilters {
  search:      string;
  category:    string;
  subcategory: string;
  brand:       string;
  vendorId:    string;
  status:      string; // "" | "approved" | "pending" | "rejected"
  inStock:     string; // "" | "true" | "false"
  badge:       string;
  minPrice:    string;
  maxPrice:    string;
  rating:      string;
  discount:    string;
  dateFrom:    string;
  dateTo:      string;
  sortBy:      string;
}

interface AdminProductsState {
  page:     number;
  filters:  AdminProductFilters;

  setPage:      (page: number) => void;
  setFilter:    (partial: Partial<AdminProductFilters>) => void;
  resetFilters: () => void;
}

export const DEFAULT_PRODUCT_FILTERS: AdminProductFilters = {
  search: "", category: "", subcategory: "", brand: "", vendorId: "",
  status: "", inStock: "", badge: "", minPrice: "", maxPrice: "",
  rating: "", discount: "", dateFrom: "", dateTo: "", sortBy: "newest",
};

export const useAdminProductsStore = create<AdminProductsState>((set) => ({
  page:    1,
  filters: { ...DEFAULT_PRODUCT_FILTERS },

  setPage:      (page)    => set({ page }),
  setFilter:    (partial) => set((s) => ({ filters: { ...s.filters, ...partial }, page: 1 })),
  resetFilters: ()        => set({ filters: { ...DEFAULT_PRODUCT_FILTERS }, page: 1 }),
}));
