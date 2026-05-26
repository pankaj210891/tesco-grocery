import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import type { Product, VendorOrder, VendorAnalytics, ProductBadge } from "@/types";

interface PaginatedData<T> {
  data:       T[];
  total:      number;
  page:       number;
  totalPages: number;
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchVendorProducts(
  token: string,
  page  = 1,
  limit = 20,
): Promise<PaginatedData<Product>> {
  const client = authClient(token);
  const res    = await client.get<ApiResponse<PaginatedData<Product>>>(
    `/api/vendor/products?page=${page}&limit=${limit}`,
  );
  return res.data.data as PaginatedData<Product>;
}

export interface VendorProductInput {
  name:           string;
  slug:           string;
  description:    string;
  price:          number;
  originalPrice?: number | null;
  category:       string;
  brand:          string;
  unit:           string;
  inStock:        boolean;
  stockQuantity?: number | null;
  images:         string[];
  tags:           string[];
  badge?:         ProductBadge | null;
  attributes?:    Record<string, string>;
}

export async function createVendorProduct(
  token: string,
  input: VendorProductInput,
): Promise<Product> {
  const client = authClient(token);
  const res    = await client.post<ApiResponse<Product>>("/api/vendor/products", input);
  return res.data.data as Product;
}

export async function updateVendorProduct(
  token: string,
  id:    string,
  input: Partial<VendorProductInput>,
): Promise<Product> {
  const client = authClient(token);
  const res    = await client.put<ApiResponse<Product>>(`/api/vendor/products/${id}`, input);
  return res.data.data as Product;
}

export async function deleteVendorProduct(token: string, id: string): Promise<void> {
  const client = authClient(token);
  await client.delete(`/api/vendor/products/${id}`);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface VendorOrderFetchParams {
  page?:     number;
  limit?:    number;
  status?:   string;
  search?:   string;
  dateFrom?: string;
  dateTo?:   string;
  sortBy?:   string;
}

export async function fetchVendorOrders(
  token:  string,
  params: VendorOrderFetchParams = {},
): Promise<PaginatedData<VendorOrder>> {
  const { page = 1, limit = 20, status, search, dateFrom, dateTo, sortBy } = params;
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status)   qs.set("status",   status);
  if (search)   qs.set("search",   search);
  if (dateFrom) qs.set("dateFrom", dateFrom);
  if (dateTo)   qs.set("dateTo",   dateTo);
  if (sortBy && sortBy !== "newest") qs.set("sortBy", sortBy);

  const client = authClient(token);
  const res    = await client.get<ApiResponse<PaginatedData<VendorOrder>>>(
    `/api/vendor/orders?${qs.toString()}`,
  );
  return res.data.data as PaginatedData<VendorOrder>;
}

export async function updateVendorOrderStatus(
  token:  string,
  id:     string,
  status: string,
  note?:  string,
): Promise<VendorOrder> {
  const client = authClient(token);
  const res    = await client.patch<ApiResponse<VendorOrder>>(
    `/api/vendor/orders/${id}/status`,
    { status, ...(note ? { note } : {}) },
  );
  return res.data.data as VendorOrder;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function fetchVendorAnalytics(token: string): Promise<VendorAnalytics> {
  const client = authClient(token);
  const res    = await client.get<ApiResponse<VendorAnalytics>>("/api/vendor/analytics");
  return res.data.data as VendorAnalytics;
}
