import { create } from "zustand";
import type { Order, AdminVendorStats } from "@/types";

interface PageMeta {
  total:      number;
  page:       number;
  totalPages: number;
}

interface AdminOrderFilters {
  status:   string;
  q:        string;
  dateFrom: string;
  dateTo:   string;
  userId:   string;
  vendorId: string;
}

interface AdminOrdersState {
  orders:   Order[];
  meta:     PageMeta;
  page:     number;
  loading:  boolean;
  filters:  AdminOrderFilters;

  setOrders:  (orders: Order[], meta: PageMeta) => void;
  setPage:    (page: number) => void;
  setLoading: (v: boolean) => void;
  setFilter:  (partial: Partial<AdminOrderFilters>) => void;
  resetFilters: () => void;
  updateOrderStatus: (id: string, status: string) => void;
}

interface AdminAnalyticsState {
  topVendors:         AdminVendorStats[];
  analyticsLoading:   boolean;
  setTopVendors:      (data: AdminVendorStats[]) => void;
  setAnalyticsLoading: (v: boolean) => void;
}

const DEFAULT_META: PageMeta = { total: 0, page: 1, totalPages: 1 };
const DEFAULT_FILTERS: AdminOrderFilters = {
  status: "all", q: "", dateFrom: "", dateTo: "", userId: "", vendorId: "",
};

type AdminOrdersStore = AdminOrdersState & AdminAnalyticsState;

export const useAdminOrdersStore = create<AdminOrdersStore>((set) => ({
  // Orders
  orders:  [],
  meta:    DEFAULT_META,
  page:    1,
  loading: false,
  filters: DEFAULT_FILTERS,

  setOrders:  (orders, meta) => set({ orders, meta }),
  setPage:    (page)         => set({ page }),
  setLoading: (v)            => set({ loading: v }),
  setFilter:  (partial)      => set((s) => ({ filters: { ...s.filters, ...partial }, page: 1 })),
  resetFilters: ()           => set({ filters: DEFAULT_FILTERS, page: 1 }),
  updateOrderStatus: (id, status) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o._id === id ? { ...o, status: status as Order["status"] } : o,
      ),
    })),

  // Analytics
  topVendors:          [],
  analyticsLoading:    false,
  setTopVendors:       (data) => set({ topVendors: data }),
  setAnalyticsLoading: (v)    => set({ analyticsLoading: v }),
}));
