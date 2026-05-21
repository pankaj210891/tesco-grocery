"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, Search, X, Filter, RotateCcw, Trash2 } from "lucide-react";
import { ProductsTable } from "@/components/common/ProductsTable";
import { useAuthStore } from "@/store/auth.store";
import {
  useAdminProductsStore,
  type AdminProductFilters,
} from "@/store/admin-products.store";
import { useDebounce } from "@/hooks/useDebounce";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import type { Product, ProductBadge, Vendor } from "@/types";
import { useScrollLock } from "@/hooks/useScrollLock";
import DynamicAttributeFields from "@/components/product/DynamicAttributeFields";

interface PageData { products: Product[]; total: number; page: number; totalPages: number; }


const PRODUCT_STATUSES = ["", "approved", "pending", "rejected"] as const;
const STATUS_LABELS: Record<string, string> = { "": "All", approved: "Approved", pending: "Pending", rejected: "Rejected" };

const EMPTY_FORM = {
  name: "", slug: "", description: "", price: "", originalPrice: "",
  category: "", brand: "", unit: "", images: "", tags: "",
  badge: "" as ProductBadge | "", inStock: true,
  vendorId: "", vendorName: "",
};

type AttrMap = Record<string, string>;

interface VariantRow {
  label: string; sku: string;
  price: string; originalPrice: string;
  stockQuantity: string; inStock: boolean;
}

const EMPTY_VARIANT: VariantRow = {
  label: "", sku: "", price: "", originalPrice: "", stockQuantity: "", inStock: true,
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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
  const router   = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { page, filters, setPage, setFilter, resetFilters } = useAdminProductsStore();

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
  const [form, setForm]           = useState({ ...EMPTY_FORM });
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

  const authHeader = { Authorization: `Bearer ${token}` };

  // Sync store from URL on mount
  useEffect(() => {
    const p: Partial<AdminProductFilters> = {
      search:      searchParams.get("search")      ?? "",
      category:    searchParams.get("category")    ?? "",
      subcategory: searchParams.get("subcategory") ?? "",
      brand:       searchParams.get("brand")       ?? "",
      vendorId:    searchParams.get("vendorId")    ?? "",
      status:      searchParams.get("status")      ?? "",
      inStock:     searchParams.get("inStock")     ?? "",
      badge:       searchParams.get("badge")       ?? "",
      minPrice:    searchParams.get("minPrice")    ?? "",
      maxPrice:    searchParams.get("maxPrice")    ?? "",
      rating:      searchParams.get("rating")      ?? "",
      discount:    searchParams.get("discount")    ?? "",
      dateFrom:    searchParams.get("dateFrom")    ?? "",
      dateTo:      searchParams.get("dateTo")      ?? "",
      sortBy:      searchParams.get("sortBy")      ?? "newest",
    };
    setFilter(p);
    const pg = Number(searchParams.get("page") ?? 1);
    if (pg > 1) setPage(pg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch vendors, categories, brands (once)
  useEffect(() => {
    if (!token) return;
    Promise.all([
      // All vendors for the filter dropdown (any status so admins can filter by suspended vendors too)
      fetch("/api/admin/vendors?limit=100", { headers: authHeader })
        .then((r) => r.json() as Promise<{ success: boolean; data: { vendors: Pick<Vendor, "_id" | "name">[] } }>)
        .then((j) => { if (j.success) setVendors(j.data.vendors); }),
      // Active vendors only for the Add/Edit form vendor selector
      fetch("/api/admin/vendors/dropdown?limit=100", { headers: authHeader })
        .then((r) => r.json() as Promise<{ success: boolean; data: { vendors: Pick<Vendor, "_id" | "name">[] } }>)
        .then((j) => { if (j.success) setActiveVendors(j.data.vendors); }),
      fetch("/api/admin/categories", { headers: authHeader })
        .then((r) => r.json() as Promise<{ success: boolean; data: { name: string }[] }>)
        .then((j) => { if (j.success) setCategories(j.data.map((c) => c.name)); }),
      fetch("/api/brands")
        .then((r) => r.json() as Promise<{ success: boolean; data: string[] }>)
        .then((j) => { if (j.success) setBrands(j.data); }),
    ]).catch(() => { /* non-critical */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    fetch(`/api/admin/products?${qs}`, { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: PageData }>)
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, filters.category, filters.subcategory, filters.brand,
      filters.vendorId, filters.status, filters.inStock, filters.badge,
      debouncedMinPrice, debouncedMaxPrice, filters.rating, filters.discount,
      filters.dateFrom, filters.dateTo, filters.sortBy, token]);

  // Auth guard
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
  }, [user, router]);

  // Fetch when filters / page change
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, user]);

  // Sync URL when filter state changes (after initial mount)
  useEffect(() => {
    const qs = buildQS(filters, page);
    const url = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
    router.replace(url, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setFormAttrs({});
    setVariants([]);
    setEditing(null);
    setError("");
    setModal("add");
  }

  function openEdit(p: Product) {
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
  }

  function updateVariant(idx: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
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
      // Strip empty attribute values before saving
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
      const url    = editing ? `/api/admin/products/${editing._id}` : "/api/admin/products";
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json   = await res.json() as { success: boolean; error?: string };
      if (!json.success) { setError(json.error ?? "Failed"); return; }
      setModal(null);
      void load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: authHeader });
      if (!res.ok) { setError("Failed to delete product. Please try again."); return; }
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function handleApproval(id: string, status: "approved" | "rejected") {
    setApproving(id);
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApproving(null);
    if (res.ok) {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, products: prev.products.map((p) => p._id === id ? { ...p, status } : p) };
      });
    }
  }

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
            {["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"].map((b) => (
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
              <input
                type="number" min="0"
                value={filters.minPrice}
                onChange={(e) => setFilter({ minPrice: e.target.value })}
                placeholder="Min ₹"
                className={`${selectCls} w-24`}
                data-testid="min-price-filter"
              />
              <span className="text-gray-400 text-sm">–</span>
              <input
                type="number" min="0"
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
              <Chip label={`"${filters.search}"`} onRemove={() => setFilter({ search: "" })} />
            )}
            {filters.category && (
              <Chip label={`Cat: ${filters.category}`} onRemove={() => setFilter({ category: "" })} />
            )}
            {filters.subcategory && (
              <Chip label={`Sub: ${filters.subcategory}`} onRemove={() => setFilter({ subcategory: "" })} />
            )}
            {filters.brand && (
              <Chip label={`Brand: ${filters.brand}`} onRemove={() => setFilter({ brand: "" })} />
            )}
            {filters.vendorId && (
              <Chip label={`Vendor: ${vendors.find((v) => v._id === filters.vendorId)?.name ?? filters.vendorId}`} onRemove={() => setFilter({ vendorId: "" })} />
            )}
            {filters.status && (
              <Chip label={STATUS_LABELS[filters.status] ?? filters.status} onRemove={() => setFilter({ status: "" })} />
            )}
            {filters.inStock && (
              <Chip label={filters.inStock === "true" ? "In Stock" : "Out of Stock"} onRemove={() => setFilter({ inStock: "" })} />
            )}
            {filters.badge && (
              <Chip label={`Badge: ${filters.badge}`} onRemove={() => setFilter({ badge: "" })} />
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <Chip label={`₹${filters.minPrice || "0"} – ₹${filters.maxPrice || "∞"}`} onRemove={() => setFilter({ minPrice: "", maxPrice: "" })} />
            )}
            {filters.rating && (
              <Chip label={`${filters.rating}+ Stars`} onRemove={() => setFilter({ rating: "" })} />
            )}
            {filters.discount && (
              <Chip label={`${filters.discount}%+ off`} onRemove={() => setFilter({ discount: "" })} />
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <Chip label={`${filters.dateFrom || "…"} → ${filters.dateTo || "…"}`} onRemove={() => setFilter({ dateFrom: "", dateTo: "" })} />
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

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="add-product-modal">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">{editing ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
              {(["name", "description"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 capitalize">{field}</label>
                  {field === "description" ? (
                    <textarea rows={3} value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75] resize-none" />
                  ) : (
                    <input type="text" value={form[field]} onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({ ...f, [field]: val, ...(field === "name" && !editing ? { slug: slugify(val) } : {}) }));
                    }} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setForm((f) => ({ ...f, category: cat }));
                    // Clear dynamic attributes when category changes
                    setFormAttrs({});
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                  data-testid="product-category-select"
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Dynamic attribute fields based on selected category */}
              <DynamicAttributeFields
                category={form.category}
                values={formAttrs}
                onChange={setFormAttrs}
                accentColor="#0F4C75"
              />
              {(["brand", "unit"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 capitalize">{field}</label>
                  <input type="text" value={form[field]} onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({ ...f, [field]: val }));
                  }} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Slug</label>
                <input type="text" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Price (₹)</label>
                  <input type="number" step="1" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Original Price (₹)</label>
                  <input type="number" step="0.01" min="0" value={form.originalPrice} onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Badge</label>
                <select value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value as ProductBadge | "" }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]">
                  <option value="">None</option>
                  {["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"].map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Vendor
                  <span className="ml-1 text-gray-400 font-normal normal-case text-xs">(optional — active vendors only)</span>
                </label>
                <select
                  value={form.vendorId}
                  onChange={(e) => {
                    const selected = activeVendors.find((v) => v._id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      vendorId:   e.target.value,
                      vendorName: selected?.name ?? "",
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                  data-testid="vendor-select"
                >
                  <option value="">Platform (No Vendor)</option>
                  {activeVendors.map((v) => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
                {form.vendorId && (
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Mapped to: <span className="font-semibold">{form.vendorName}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Images (URLs, comma-separated)</label>
                <input type="text" value={form.images} onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
              </div>
              {/* Product Variants */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product Variants</span>
                  <button
                    type="button"
                    onClick={() => setVariants((rows) => [...rows, { ...EMPTY_VARIANT }])}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0F4C75] border border-[#0F4C75]/40 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Variant
                  </button>
                </div>
                {variants.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">No variants — product has a single price.</p>
                )}
                {variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr] gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg relative">
                    <button
                      type="button"
                      onClick={() => setVariants((rows) => rows.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove variant"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Label *</label>
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) => updateVariant(idx, { label: e.target.value })}
                        placeholder="e.g. 500g, Red, XL"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">SKU</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                        placeholder="VAR-001"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Stock</label>
                      <input
                        type="number" min="0"
                        value={v.stockQuantity}
                        onChange={(e) => updateVariant(idx, { stockQuantity: e.target.value })}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Price (₹)</label>
                      <input
                        type="number" min="0"
                        value={v.price}
                        onChange={(e) => updateVariant(idx, { price: e.target.value })}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Sale Price (₹)</label>
                      <input
                        type="number" min="0"
                        value={v.originalPrice}
                        onChange={(e) => updateVariant(idx, { originalPrice: e.target.value })}
                        placeholder="Optional"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`variant-instock-${idx}`}
                        checked={v.inStock}
                        onChange={(e) => updateVariant(idx, { inStock: e.target.checked })}
                        className="h-3.5 w-3.5 rounded"
                      />
                      <label htmlFor={`variant-instock-${idx}`} className="text-xs font-medium text-gray-600 dark:text-gray-400">In Stock</label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="inStock" checked={form.inStock} onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))} className="h-4 w-4 rounded" />
                <label htmlFor="inStock" className="text-sm font-medium text-gray-700 dark:text-gray-300">In Stock</label>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-[#0F4C75] rounded-lg hover:bg-[#0A3352] disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900 dark:hover:text-blue-100" aria-label={`Remove ${label} filter`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <AdminProductsPageInner />
    </Suspense>
  );
}
