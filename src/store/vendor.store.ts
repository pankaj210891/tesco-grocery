import { create } from "zustand";
import type { Product, VendorOrder, VendorAnalytics } from "@/types";

// ── Shared pagination shape ───────────────────────────────────────────────────

interface PageMeta {
  total:      number;
  page:       number;
  totalPages: number;
}

// ── Vendor Products slice ─────────────────────────────────────────────────────

interface VendorProductsState {
  products:        Product[];
  productsMeta:    PageMeta;
  productsPage:    number;
  productsLoading: boolean;
  setProducts:     (products: Product[], meta: PageMeta) => void;
  setProductsPage: (page: number) => void;
  setProductsLoading: (v: boolean) => void;
}

// ── Vendor Orders slice ───────────────────────────────────────────────────────

interface VendorOrdersState {
  orders:             VendorOrder[];
  ordersMeta:         PageMeta;
  ordersPage:         number;
  ordersStatus:       string;
  ordersSearch:       string;
  ordersDateFrom:     string;
  ordersDateTo:       string;
  ordersSortBy:       string;
  ordersLoading:      boolean;
  setOrders:          (orders: VendorOrder[], meta: PageMeta) => void;
  setOrdersPage:      (page: number) => void;
  setOrdersStatus:    (status: string) => void;
  setOrdersSearch:    (search: string) => void;
  setOrdersDateFrom:  (date: string) => void;
  setOrdersDateTo:    (date: string) => void;
  setOrdersSortBy:    (sort: string) => void;
  resetOrdersFilters: () => void;
  setOrdersLoading:   (v: boolean) => void;
  updateOrderStatus:  (id: string, status: string) => void;
}

// ── Vendor Analytics slice ────────────────────────────────────────────────────

interface VendorAnalyticsState {
  analytics:        VendorAnalytics | null;
  analyticsLoading: boolean;
  setAnalytics:     (data: VendorAnalytics) => void;
  setAnalyticsLoading: (v: boolean) => void;
}

// ── Combined store ────────────────────────────────────────────────────────────

type VendorStore = VendorProductsState & VendorOrdersState & VendorAnalyticsState;

const DEFAULT_META: PageMeta = { total: 0, page: 1, totalPages: 1 };

export const useVendorStore = create<VendorStore>((set) => ({
  // Products
  products:           [],
  productsMeta:       DEFAULT_META,
  productsPage:       1,
  productsLoading:    false,
  setProducts:        (products, meta) => set({ products, productsMeta: meta }),
  setProductsPage:    (page)           => set({ productsPage: page }),
  setProductsLoading: (v)              => set({ productsLoading: v }),

  // Orders
  orders:             [],
  ordersMeta:         DEFAULT_META,
  ordersPage:         1,
  ordersStatus:       "",
  ordersSearch:       "",
  ordersDateFrom:     "",
  ordersDateTo:       "",
  ordersSortBy:       "newest",
  ordersLoading:      false,
  setOrders:          (orders, meta) => set({ orders, ordersMeta: meta }),
  setOrdersPage:      (page)         => set({ ordersPage: page }),
  setOrdersStatus:    (status)       => set({ ordersStatus: status, ordersPage: 1 }),
  setOrdersSearch:    (search)       => set({ ordersSearch: search,   ordersPage: 1 }),
  setOrdersDateFrom:  (date)         => set({ ordersDateFrom: date,   ordersPage: 1 }),
  setOrdersDateTo:    (date)         => set({ ordersDateTo: date,     ordersPage: 1 }),
  setOrdersSortBy:    (sort)         => set({ ordersSortBy: sort,     ordersPage: 1 }),
  resetOrdersFilters: ()             => set({ ordersStatus: "", ordersSearch: "", ordersDateFrom: "", ordersDateTo: "", ordersSortBy: "newest", ordersPage: 1 }),
  setOrdersLoading:   (v)            => set({ ordersLoading: v }),
  updateOrderStatus:  (id, status)   =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o._id === id ? { ...o, status: status as VendorOrder["status"] } : o,
      ),
    })),

  // Analytics
  analytics:           null,
  analyticsLoading:    false,
  setAnalytics:        (data) => set({ analytics: data }),
  setAnalyticsLoading: (v)    => set({ analyticsLoading: v }),
}));
