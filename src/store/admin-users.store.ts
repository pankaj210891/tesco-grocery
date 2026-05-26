import { createAdminStore } from "./createAdminStore";

export interface AdminUserFilters {
  [key: string]: string;
  search:   string;
  role:     string; // "" | "customer" | "vendor" | "admin"
  status:   string; // "" | "active" | "suspended"
  dateFrom: string;
  dateTo:   string;
  sortBy:   string;
}

export const DEFAULT_USER_FILTERS: AdminUserFilters = {
  search: "", role: "", status: "", dateFrom: "", dateTo: "", sortBy: "newest",
};

export const useAdminUsersStore = createAdminStore<AdminUserFilters>(DEFAULT_USER_FILTERS);
