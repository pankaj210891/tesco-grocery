import type { Product, Order, AdminVendorStats, AdminDashboardStats, ProductStatus } from "@/types";

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json()) as { success: boolean; data?: T; error?: string };
  if (!body.success) throw new Error(body.error ?? "Request failed");
  return body.data as T;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function fetchAdminStats(token: string): Promise<AdminDashboardStats> {
  const res = await fetch("/api/admin/stats", { headers: authHeader(token) });
  return json<AdminDashboardStats>(res);
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
  const res = await fetch(`/api/admin/products?${qs}`, { headers: authHeader(token) });
  return json<PaginatedData<Product>>(res);
}

export async function updateAdminProductStatus(
  token:     string,
  id:        string,
  status:    ProductStatus,
): Promise<Product> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method:  "PATCH",
    headers: authHeader(token),
    body:    JSON.stringify({ status }),
  });
  return json<Product>(res);
}

export async function deleteAdminProduct(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method:  "DELETE",
    headers: authHeader(token),
  });
  await json<null>(res);
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
  const res = await fetch(`/api/admin/orders?${qs}`, { headers: authHeader(token) });
  return json<PaginatedData<Order>>(res);
}

export async function updateAdminOrderStatus(
  token:  string,
  id:     string,
  status: string,
): Promise<Order> {
  const res = await fetch(`/api/admin/orders/${id}`, {
    method:  "PUT",
    headers: authHeader(token),
    body:    JSON.stringify({ status }),
  });
  return json<Order>(res);
}

// ── Vendor Analytics ──────────────────────────────────────────────────────────

export async function fetchAdminVendorAnalytics(
  token:  string,
  limit = 10,
): Promise<AdminVendorStats[]> {
  const res = await fetch(`/api/admin/vendors/analytics?limit=${limit}`, {
    headers: authHeader(token),
  });
  return json<AdminVendorStats[]>(res);
}
