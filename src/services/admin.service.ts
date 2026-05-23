import { authClient } from "@/lib/axios";
import type { Product, Order, AdminVendorStats, AdminDashboardStats, ProductStatus } from "@/types";

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function fetchAdminStats(token: string): Promise<AdminDashboardStats> {
  const res = await authClient(token).get<{ success: boolean; data: AdminDashboardStats }>("/api/admin/stats");
  if (!res.data.success) throw new Error("Request failed");
  return res.data.data;
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface AdminProductFilters {
  page?:     number;
  limit?:    number;
  search?:   string;
  category?: string;
  badge?:    string;
  vendorId?: string;
  status?:   string;
}

export async function fetchAdminProducts(
  token:   string,
  filters: AdminProductFilters = {},
): Promise<PaginatedData<Product>> {
  const qs = new URLSearchParams();
  if (filters.page)     qs.set("page",     String(filters.page));
  if (filters.limit)    qs.set("limit",    String(filters.limit));
  if (filters.search)   qs.set("search",   filters.search);
  if (filters.category) qs.set("category", filters.category);
  if (filters.badge)    qs.set("badge",    filters.badge);
  if (filters.vendorId) qs.set("vendorId", filters.vendorId);
  if (filters.status)   qs.set("status",   filters.status);
  const res = await authClient(token).get<{ success: boolean; data: PaginatedData<Product> }>(`/api/admin/products?${qs}`);
  if (!res.data.success) throw new Error("Request failed");
  return res.data.data;
}

export async function updateAdminProductStatus(
  token:     string,
  id:        string,
  status:    ProductStatus,
): Promise<Product> {
  const res = await authClient(token).patch<{ success: boolean; data: Product }>(`/api/admin/products/${id}`, { status });
  if (!res.data.success) throw new Error("Request failed");
  return res.data.data;
}

export async function deleteAdminProduct(token: string, id: string): Promise<void> {
  await authClient(token).delete(`/api/admin/products/${id}`);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface AdminOrderFilters {
  page?:     number;
  limit?:    number;
  status?:   string;
  q?:        string;
  dateFrom?: string;
  dateTo?:   string;
  userId?:   string;
  vendorId?: string;
}

export async function fetchAdminOrders(
  token:   string,
  filters: AdminOrderFilters = {},
): Promise<PaginatedData<Order>> {
  const qs = new URLSearchParams();
  if (filters.page)     qs.set("page",     String(filters.page));
  if (filters.limit)    qs.set("limit",    String(filters.limit));
  if (filters.status)   qs.set("status",   filters.status);
  if (filters.q)        qs.set("q",        filters.q);
  if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)   qs.set("dateTo",   filters.dateTo);
  if (filters.userId)   qs.set("userId",   filters.userId);
  if (filters.vendorId) qs.set("vendorId", filters.vendorId);
  const res = await authClient(token).get<{ success: boolean; data: PaginatedData<Order> }>(`/api/admin/orders?${qs}`);
  if (!res.data.success) throw new Error("Request failed");
  return res.data.data;
}

export async function updateAdminOrderStatus(
  token:  string,
  id:     string,
  status: string,
): Promise<Order> {
  const res = await authClient(token).put<{ success: boolean; data: Order }>(`/api/admin/orders/${id}`, { status });
  if (!res.data.success) throw new Error("Request failed");
  return res.data.data;
}

// ── Vendor Analytics ──────────────────────────────────────────────────────────

export async function fetchAdminVendorAnalytics(
  token:  string,
  limit = 10,
): Promise<AdminVendorStats[]> {
  const res = await authClient(token).get<{ success: boolean; data: AdminVendorStats[] }>(`/api/admin/vendors/analytics?limit=${limit}`);
  if (!res.data.success) throw new Error("Request failed");
  return res.data.data;
}
