import { createAdminStore } from "./createAdminStore";

export interface AdminProductFilters {
  [key: string]: string;
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

export const DEFAULT_PRODUCT_FILTERS: AdminProductFilters = {
  search: "", category: "", subcategory: "", brand: "", vendorId: "",
  status: "", inStock: "", badge: "", minPrice: "", maxPrice: "",
  rating: "", discount: "", dateFrom: "", dateTo: "", sortBy: "newest",
};

export const useAdminProductsStore = createAdminStore<AdminProductFilters>(DEFAULT_PRODUCT_FILTERS);
