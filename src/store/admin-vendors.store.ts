import { createAdminStore } from "./createAdminStore";

export interface AdminVendorFilters {
  [key: string]: string;
  search:   string;
  status:   string; // "" | "pending" | "active" | "suspended"
  dateFrom: string;
  dateTo:   string;
}

export const DEFAULT_VENDOR_FILTERS: AdminVendorFilters = {
  search: "", status: "", dateFrom: "", dateTo: "",
};

export const useAdminVendorsStore = createAdminStore<AdminVendorFilters>(DEFAULT_VENDOR_FILTERS);
