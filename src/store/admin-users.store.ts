import { create } from "zustand";

export interface AdminUserFilters {
  search:   string;
  role:     string; // "" | "customer" | "vendor" | "admin"
  status:   string; // "" | "active" | "suspended"
  dateFrom: string;
  dateTo:   string;
  sortBy:   string;
}

interface AdminUsersState {
  page:     number;
  filters:  AdminUserFilters;

  setPage:      (page: number) => void;
  setFilter:    (partial: Partial<AdminUserFilters>) => void;
  resetFilters: () => void;
}

export const DEFAULT_USER_FILTERS: AdminUserFilters = {
  search: "", role: "", status: "", dateFrom: "", dateTo: "", sortBy: "newest",
};

export const useAdminUsersStore = create<AdminUsersState>((set) => ({
  page:    1,
  filters: { ...DEFAULT_USER_FILTERS },

  setPage:      (page)    => set({ page }),
  setFilter:    (partial) => set((s) => ({ filters: { ...s.filters, ...partial }, page: 1 })),
  resetFilters: ()        => set({ filters: { ...DEFAULT_USER_FILTERS }, page: 1 }),
}));
