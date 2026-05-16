import { create } from "zustand";
import type { Order, OrderDetail, AdminVendorStats } from "@/types";

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
  vendorId: string;
}

interface AdminOrdersState {
  orders:   Order[];
  meta:     PageMeta;
  page:     number;
  loading:  boolean;
  filters:  AdminOrderFilters;

  // Order detail + refund
  selectedOrderId:    string | null;
  orderDetail:        OrderDetail | null;
  orderDetailLoading: boolean;
  refundLoading:      boolean;

  setOrders:  (orders: Order[], meta: PageMeta) => void;
  setPage:    (page: number) => void;
  setLoading: (v: boolean) => void;
  setFilter:  (partial: Partial<AdminOrderFilters>) => void;
  resetFilters: () => void;
  updateOrderStatus: (id: string, status: string) => void;

  setSelectedOrderId:    (id: string | null) => void;
  setOrderDetail:        (order: OrderDetail | null) => void;
  setOrderDetailLoading: (v: boolean) => void;
  setRefundLoading:      (v: boolean) => void;
  applyRefundToDetail:   (updated: OrderDetail) => void;
}

interface AdminAnalyticsState {
  topVendors:          AdminVendorStats[];
  analyticsLoading:    boolean;
  setTopVendors:       (data: AdminVendorStats[]) => void;
  setAnalyticsLoading: (v: boolean) => void;
}

const DEFAULT_META: PageMeta = { total: 0, page: 1, totalPages: 1 };
const DEFAULT_FILTERS: AdminOrderFilters = {
  status: "all", q: "", dateFrom: "", dateTo: "", vendorId: "",
};

type AdminOrdersStore = AdminOrdersState & AdminAnalyticsState;

export const useAdminOrdersStore = create<AdminOrdersStore>((set) => ({
  orders:  [],
  meta:    DEFAULT_META,
  page:    1,
  loading: false,
  filters: DEFAULT_FILTERS,

  selectedOrderId:    null,
  orderDetail:        null,
  orderDetailLoading: false,
  refundLoading:      false,

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

  setSelectedOrderId:    (id)      => set({ selectedOrderId: id }),
  setOrderDetail:        (order)   => set({ orderDetail: order }),
  setOrderDetailLoading: (v)       => set({ orderDetailLoading: v }),
  setRefundLoading:      (v)       => set({ refundLoading: v }),
  applyRefundToDetail:   (updated) => set({ orderDetail: updated }),

  topVendors:          [],
  analyticsLoading:    false,
  setTopVendors:       (data) => set({ topVendors: data }),
  setAnalyticsLoading: (v)    => set({ analyticsLoading: v }),
}));
