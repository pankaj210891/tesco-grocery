import type { Product, Order, VendorAnalytics, ProductBadge } from "@/types";

// Typed fetch wrapper — re-uses the pattern in the codebase (no axios import needed,
// the project uses raw fetch for client service calls)

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

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchVendorProducts(
  token: string,
  page  = 1,
  limit = 20,
): Promise<PaginatedData<Product>> {
  const qs  = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await fetch(`/api/vendor/products?${qs}`, { headers: authHeader(token) });
  return json<PaginatedData<Product>>(res);
}

export interface VendorProductInput {
  name:          string;
  slug:          string;
  description:   string;
  price:         number;
  originalPrice?: number | null;
  category:      string;
  brand:         string;
  unit:          string;
  inStock:       boolean;
  images:        string[];
  tags:          string[];
  badge?:        ProductBadge | null;
}

export async function createVendorProduct(
  token: string,
  input: VendorProductInput,
): Promise<Product> {
  const res = await fetch("/api/vendor/products", {
    method:  "POST",
    headers: authHeader(token),
    body:    JSON.stringify(input),
  });
  return json<Product>(res);
}

export async function updateVendorProduct(
  token:   string,
  id:      string,
  input:   Partial<VendorProductInput>,
): Promise<Product> {
  const res = await fetch(`/api/vendor/products/${id}`, {
    method:  "PUT",
    headers: authHeader(token),
    body:    JSON.stringify(input),
  });
  return json<Product>(res);
}

export async function deleteVendorProduct(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/vendor/products/${id}`, {
    method:  "DELETE",
    headers: authHeader(token),
  });
  await json<null>(res);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function fetchVendorOrders(
  token:  string,
  page    = 1,
  limit   = 20,
  status  = "",
): Promise<PaginatedData<Order>> {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) qs.set("status", status);
  const res = await fetch(`/api/vendor/orders?${qs}`, { headers: authHeader(token) });
  return json<PaginatedData<Order>>(res);
}

export async function updateVendorOrderStatus(
  token:  string,
  id:     string,
  status: string,
): Promise<Order> {
  const res = await fetch(`/api/vendor/orders/${id}`, {
    method:  "PATCH",
    headers: authHeader(token),
    body:    JSON.stringify({ status }),
  });
  return json<Order>(res);
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function fetchVendorAnalytics(token: string): Promise<VendorAnalytics> {
  const res = await fetch("/api/vendor/analytics", { headers: authHeader(token) });
  return json<VendorAnalytics>(res);
}
