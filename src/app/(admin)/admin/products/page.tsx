"use client";

import { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { Plus, Search, Filter, RotateCcw } from "lucide-react";
import { ProductsTable } from "@/components/common/ProductsTable";
import { useAuthStore } from "@/store/auth.store";
import { authClient, apiClient } from "@/lib/axios";
import {
  useAdminProductsStore,
  type AdminProductFilters,
  DEFAULT_PRODUCT_FILTERS,
} from "@/store/admin-products.store";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { FilterChip } from "@/components/admin/FilterChip";
import { useDebounce } from "@/hooks/useDebounce";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import type { Product, Vendor } from "@/types";
import { useScrollLock } from "@/hooks/useScrollLock";
import NumberInput from "@/components/ui/NumberInput";

// Lazy-load the heavy Add/Edit modal — not needed until user clicks Add/Edit
const AdminProductModal = lazy(() => import("./AdminProductModal"));

import {
  EMPTY_FORM,
  type FormState, type AttrMap, type VariantRow,
} from "./AdminProductModal";

interface PageData { products: Product[]; total: number; page: number; totalPages: number; }

const PRODUCT_STATUSES = ["", "approved", "pending", "rejected"] as const;
const STATUS_LABELS: Record<string, string> = { "": "All", approved: "Approved", pending: "Pending", rejected: "Rejected" };

function buildQS(filters: AdminProductFilters, page: number): URLSearchParams {
  const qs = new URLSearchParams();
  if (page > 1)               qs.set("page",       String(page));
  if (filters.search)         qs.set("search",     filters.search);
  if (filters.category)       qs.set("category",   filters.category);
  if (filters.subcategory)    qs.set("subcategory", filters.subcategory);
  if (filters.brand)          qs.set("brand",      filters.brand);
  if (filters.vendorId)       qs.set("vendorId",   filters.vendorId);
  if (filters.status)         qs.set("status",     filters.status);
  if (filters.inStock)        qs.set("inStock",    filters.inStock);
  if (filters.badge)          qs.set("badge",      filters.badge);
  if (filters.minPrice)       qs.set("minPrice",   filters.minPrice);
  if (filters.maxPrice)       qs.set("maxPrice",   filters.maxPrice);
  if (filters.rating)         qs.set("rating",     filters.rating);
  if (filters.discount)       qs.set("discount",   filters.discount);
  if (filters.dateFrom)       qs.set("dateFrom",   filters.dateFrom);
  if (filters.dateTo)         qs.set("dateTo",     filters.dateTo);
  if (filters.sortBy && filters.sortBy !== "newest") qs.set("sortBy", filters.sortBy);
  return qs;
}

function hasActiveFilters(f: AdminProductFilters): boolean {
  return !!(
    f.search || f.category || f.subcategory || f.brand || f.vendorId ||
    f.status || f.inStock || f.badge || f.minPrice || f.maxPrice ||
    f.rating || f.discount || f.dateFrom || f.dateTo ||
    (f.sortBy && f.sortBy !== "newest")
  );
}

function AdminProductsPageInner() {
  const { user, token } = useAuthStore();

  const { page, filters, setPage, setFilter, resetFilters } = useAdminProductsStore();

  const { filterReady } = useAdminFilters({
    defaultFilters: DEFAULT_PRODUCT_FILTERS,
    buildQS,
    setFilter,
    setPage,
    filters,
    page,
  });

  const [data, setData]           = useState<PageData | null>(null);
  // All vendors (any status) — used by the filter dropdown in the table header
  const [vendors, setVendors]     = useState<Pick<Vendor, "_id" | "name">[]>([]);
  // Active vendors only — used by the Add/Edit form vendor selector
  const [activeVendors, setActiveVendors] = useState<Pick<Vendor, "_id" | "name">[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands]       = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<"add" | "edit" | null>(null);
  const [editing, setEditing]     = useState<Product | null>(null);
  const [form, setForm]           = useState<FormState>({ ...EMPTY_FORM });
  const [formAttrs, setFormAttrs]   = useState<AttrMap>({});
  const [variants, setVariants]     = useState<VariantRow[]>([]);
  const [saving, setSaving]         = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError]         = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useScrollLock(modal !== null);

  // Debounce text inputs
  const debouncedSearch   = useDebounce(filters.search, 350);
  const debouncedMinPrice = useDebounce(filters.minPrice, 500);
  const debouncedMaxPrice = useDebounce(filters.maxPrice, 500);

  // Fetch vendors, categories, brands (once)
  useEffect(() => {
    if (!token) return;
    Promise.all([
      // All vendors for the filter dropdown (any status so admins can filter by suspended vendors too)
      authClient(token!).get<{ success: boolean; data: { vendors: Pick<Vendor, "_id" | "name">[] } }>("/api/admin/vendors?limit=100")
        .then((res) => { if (res.data.success) setVendors(res.data.data.vendors); }),
      // Active vendors only for the Add/Edit form vendor selector
      authClient(token!).get<{ success: boolean; data: { vendors: Pick<Vendor, "_id" | "name">[] } }>("/api/admin/vendors/dropdown?limit=100")
        .then((res) => { if (res.data.success) setActiveVendors(res.data.data.vendors); }),
      authClient(token!).get<{ success: boolean; data: { name: string }[] }>("/api/admin/categories")
        .then((res) => { if (res.data.success) setCategories(res.data.data.map((c) => c.name)); }),
      apiClient.get<{ success: boolean; data: string[] }>("/api/brands")
        .then((res) => { if (res.data.success) setBrands(res.data.data); }),
    ]).catch(() => { /* non-critical */ });
   
  }, [token]);

  // Build API query and fetch products
  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (debouncedSearch)        qs.set("search",     debouncedSearch);
    if (filters.category)       qs.set("category",   filters.category);
    if (filters.subcategory)    qs.set("subcategory", filters.subcategory);
    if (filters.brand)          qs.set("brand",      filters.brand);
    if (filters.vendorId)       qs.set("vendorId",   filters.vendorId);
    if (filters.status)         qs.set("status",     filters.status);
    if (filters.inStock)        qs.set("inStock",    filters.inStock);
    if (filters.badge)          qs.set("badge",      filters.badge);
    if (debouncedMinPrice) qs.set("minPrice", debouncedMinPrice);
    if (debouncedMaxPrice) qs.set("maxPrice", debouncedMaxPrice);
    if (filters.rating)         qs.set("rating",     filters.rating);
    if (filters.discount)       qs.set("discount",   filters.discount);
    if (filters.dateFrom)       qs.set("dateFrom",   filters.dateFrom);
    if (filters.dateTo)         qs.set("dateTo",     filters.dateTo);
    if (filters.sortBy)         qs.set("sortBy",     filters.sortBy);

    authClient(token!).get<{ success: boolean; data: PageData }>(`/api/admin/products?${qs}`)
      .then((res) => { if (res.data.success) setData(res.data.data); })
      .finally(() => setLoading(false));
   
  }, [page, debouncedSearch, filters.category, filters.subcategory, filters.brand,
      filters.vendorId, filters.status, filters.inStock, filters.badge,
      debouncedMinPrice, debouncedMaxPrice, filters.rating, filters.discount,
      filters.dateFrom, filters.dateTo, filters.sortBy, token]);

  // Fetch when filters / page change — gated on filterReady so the first
  // request uses URL-initialised filter values, not the empty store defaults.
  useEffect(() => {
    if (!user || user.role !== "admin" || !filterReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, user, filterReady]);

  const openAdd = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setFormAttrs({});
    setVariants([]);
    setEditing(null);
    setError("");
    setModal("add");
  }, []);

  const openEdit = useCallback((p: Product) => {
    setForm({
      name: p.name, slug: p.slug, description: p.description,
      price: String(p.price), originalPrice: String(p.originalPrice ?? ""),
      category: p.category, brand: p.brand, unit: p.unit,
      images: p.images.join(", "), tags: p.tags.join(", "),
      badge: p.badge ?? "", inStock: p.inStock,
      vendorId: p.vendorId ?? "", vendorName: p.vendorName ?? "",
    });
    setFormAttrs(p.attributes ?? {});
    setVariants(
      (p.variants ?? []).map((v) => ({
        label:         v.label,
        sku:           v.sku ?? "",
        price:         v.price != null ? String(v.price) : "",
        originalPrice: v.originalPrice != null ? String(v.originalPrice) : "",
        stockQuantity: v.stockQuantity != null ? String(v.stockQuantity) : "",
        inStock:       v.inStock,
      })),
    );
    setEditing(p);
    setError("");
    setModal("edit");
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    const body = {
      name: form.name, slug: form.slug, description: form.description,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      category: form.category, brand: form.brand, unit: form.unit,
      images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
      tags:   form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      badge:  form.badge || null, inStock: form.inStock,
      vendorId: form.vendorId || null,
      attributes: Object.fromEntries(
        Object.entries(formAttrs).filter(([, v]) => v.trim() !== ""),
      ),
      variants: variants
        .filter((v) => v.label.trim() !== "")
        .map((v) => ({
          label:         v.label.trim(),
          sku:           v.sku.trim(),
          price:         v.price !== "" ? Number(v.price) : null,
          originalPrice: v.originalPrice !== "" ? Number(v.originalPrice) : null,
          stockQuantity: v.stockQuantity !== "" ? Number(v.stockQuantity) : null,
          inStock:       v.inStock,
        })),
    };
    try {
      const url = editing ? `/api/admin/products/${editing._id}` : "/api/admin/products";
      const res = editing
        ? await authClient(token!).put<{ success: boolean; error?: string }>(url, body)
        : await authClient(token!).post<{ success: boolean; error?: string }>(url, body);
      if (!res.data.success) { setError(res.data.error ?? "Failed"); return; }
      setModal(null);
      void load();
    } finally { setSaving(false); }
  }, [form, formAttrs, variants, editing, token, load]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this product?")) return;
    setSaving(true);
    try {
      await authClient(token!).delete(`/api/admin/products/${id}`);
      void load();
    } catch {
      setError("Failed to delete product. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [token, load]);

  const handleApproval = useCallback(async (id: string, status: "approved" | "rejected") => {
    setApproving(id);
    try {
      await authClient(token!).patch(`/api/admin/products/${id}`, { status });
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, products: prev.products.map((p) => p._id === id ? { ...p, status } : p) };
      });
    } catch { /* non-critical */ }
    finally { setApproving(null); }
  }, [token]);

  const selectCls = "text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Products</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0A3352] transition-colors"
          data-testid="add-product-btn"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        {/* Row 1: Search + Sort + Advanced toggle + Clear */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Search products…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
              data-testid="product-search"
            />
          </div>

          {/* Vendor */}
          <select
            value={filters.vendorId}
            onChange={(e) => setFilter({ vendorId: e.target.value })}
            className={selectCls}
            data-testid="vendor-filter"
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>

          {/* Category */}
          <select
            value={filters.category}
            onChange={(e) => setFilter({ category: e.target.value })}
            className={selectCls}
            data-testid="category-filter"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Brand */}
          <select
            value={filters.brand}
            onChange={(e) => setFilter({ brand: e.target.value })}
            className={selectCls}
            data-testid="brand-filter"
          >
            <option value="">All Brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilter({ sortBy: e.target.value })}
            className={selectCls}
            data-testid="sort-filter"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="rating">Top Rated</option>
            <option value="name-asc">Name A–Z</option>
          </select>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showAdvanced
                ? "border-[#0F4C75] bg-blue-50 text-[#0F4C75] dark:bg-blue-950/30"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            data-testid="advanced-filters-toggle"
          >
            <Filter className="h-4 w-4" />
            More
          </button>

          {/* Clear filters */}
          {hasActiveFilters(filters) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-800 transition-colors"
              data-testid="clear-all-filters"
            >
              <RotateCcw className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {/* Row 2: Status tabs + InStock + Badge */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status tabs */}
          <div className="flex gap-1" data-testid="status-filters">
            {PRODUCT_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter({ status: s })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filters.status === s
                    ? "bg-[#0F4C75] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                data-testid={`status-filter-${s || "all"}`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* InStock */}
          <select
            value={filters.inStock}
            onChange={(e) => setFilter({ inStock: e.target.value })}
            className={selectCls}
            data-testid="instock-filter"
          >
            <option value="">All Stock</option>
            <option value="true">In Stock</option>
            <option value="false">Out of Stock</option>
          </select>

          {/* Badge */}
          <select
            value={filters.badge}
            onChange={(e) => setFilter({ badge: e.target.value })}
            className={selectCls}
            data-testid="badge-filter"
          >
            <option value="">All Badges</option>
            {["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE", "SALE"].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-100 dark:border-gray-800">
            {/* Subcategory */}
            <input
              value={filters.subcategory}
              onChange={(e) => setFilter({ subcategory: e.target.value })}
              placeholder="Subcategory"
              className={`${selectCls} w-32`}
              data-testid="subcategory-filter"
            />

            {/* Price range */}
            <div className="flex items-center gap-1">
              <NumberInput
                min="0"
                value={filters.minPrice}
                onChange={(e) => setFilter({ minPrice: e.target.value })}
                placeholder="Min ₹"
                className={`${selectCls} w-24`}
                data-testid="min-price-filter"
              />
              <span className="text-gray-400 text-sm">–</span>
              <NumberInput
                min="0"
                value={filters.maxPrice}
                onChange={(e) => setFilter({ maxPrice: e.target.value })}
                placeholder="Max ₹"
                className={`${selectCls} w-24`}
                data-testid="max-price-filter"
              />
            </div>

            {/* Min rating */}
            <select
              value={filters.rating}
              onChange={(e) => setFilter({ rating: e.target.value })}
              className={selectCls}
              data-testid="rating-filter"
            >
              <option value="">Any Rating</option>
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={String(r)}>{r}+ Stars</option>
              ))}
            </select>

            {/* Min discount */}
            <select
              value={filters.discount}
              onChange={(e) => setFilter({ discount: e.target.value })}
              className={selectCls}
              data-testid="discount-filter"
            >
              <option value="">Any Discount</option>
              {[10, 20, 25, 30, 40, 50].map((d) => (
                <option key={d} value={String(d)}>{d}%+ off</option>
              ))}
            </select>

            {/* Date range */}
            <AdminDateFilter
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              label="Added date"
              onApply={(from, to) => setFilter({ dateFrom: from, dateTo: to })}
              onClear={() => setFilter({ dateFrom: "", dateTo: "" })}
            />
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters(filters) && (
          <div className="flex flex-wrap gap-1.5 pt-1" data-testid="active-filters">
            {filters.search && (
              <FilterChip label={`"${filters.search}"`} onRemove={() => setFilter({ search: "" })} />
            )}
            {filters.category && (
              <FilterChip label={`Cat: ${filters.category}`} onRemove={() => setFilter({ category: "" })} />
            )}
            {filters.subcategory && (
              <FilterChip label={`Sub: ${filters.subcategory}`} onRemove={() => setFilter({ subcategory: "" })} />
            )}
            {filters.brand && (
              <FilterChip label={`Brand: ${filters.brand}`} onRemove={() => setFilter({ brand: "" })} />
            )}
            {filters.vendorId && (
              <FilterChip label={`Vendor: ${vendors.find((v) => v._id === filters.vendorId)?.name ?? filters.vendorId}`} onRemove={() => setFilter({ vendorId: "" })} />
            )}
            {filters.status && (
              <FilterChip label={STATUS_LABELS[filters.status] ?? filters.status} onRemove={() => setFilter({ status: "" })} />
            )}
            {filters.inStock && (
              <FilterChip label={filters.inStock === "true" ? "In Stock" : "Out of Stock"} onRemove={() => setFilter({ inStock: "" })} />
            )}
            {filters.badge && (
              <FilterChip label={`Badge: ${filters.badge}`} onRemove={() => setFilter({ badge: "" })} />
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <FilterChip label={`₹${filters.minPrice || "0"} – ₹${filters.maxPrice || "∞"}`} onRemove={() => setFilter({ minPrice: "", maxPrice: "" })} />
            )}
            {filters.rating && (
              <FilterChip label={`${filters.rating}+ Stars`} onRemove={() => setFilter({ rating: "" })} />
            )}
            {filters.discount && (
              <FilterChip label={`${filters.discount}%+ off`} onRemove={() => setFilter({ discount: "" })} />
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <FilterChip label={`${filters.dateFrom || "…"} → ${filters.dateTo || "…"}`} onRemove={() => setFilter({ dateFrom: "", dateTo: "" })} />
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <ProductsTable
        products={data?.products ?? []}
        loading={loading}
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onEdit={openEdit}
        onDelete={handleDelete}
        showVendorColumn
        showStatusColumn
        onApprove={handleApproval}
        approving={approving}
        maxHeight="calc(100vh - 380px)"
      />

      {/* Add/Edit Modal — lazy-loaded so DynamicAttributeFields + NumberInput are not
          parsed on initial page load; the modal chunk is fetched only when first opened */}
      {modal && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg h-64 animate-pulse mx-4" />
          </div>
        }>
          <AdminProductModal
            editing={editing}
            form={form}
            setForm={setForm}
            formAttrs={formAttrs}
            setFormAttrs={setFormAttrs}
            variants={variants}
            setVariants={setVariants}
            categories={categories}
            activeVendors={activeVendors}
            error={error}
            saving={saving}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <AdminProductsPageInner />
    </Suspense>
  );
}
