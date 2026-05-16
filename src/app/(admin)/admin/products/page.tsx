"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Plus, Search, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Filter, RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth.store";
import {
  useAdminProductsStore,
  type AdminProductFilters,
} from "@/store/admin-products.store";
import { useDebounce } from "@/hooks/useDebounce";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import type { Product, ProductBadge, Vendor } from "@/types";
import { useScrollLock } from "@/hooks/useScrollLock";

interface PageData { products: Product[]; total: number; page: number; totalPages: number; }

const BADGE_COLORS: Record<string, string> = {
  NEW:       "bg-blue-100 text-blue-700",
  HOT:       "bg-red-100 text-red-700",
  LIMITED:   "bg-orange-100 text-orange-700",
  ORGANIC:   "bg-green-100 text-green-700",
  EXCLUSIVE: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PRODUCT_STATUSES = ["", "approved", "pending", "rejected"] as const;
const STATUS_LABELS: Record<string, string> = { "": "All", approved: "Approved", pending: "Pending", rejected: "Rejected" };

const EMPTY_FORM = {
  name: "", slug: "", description: "", price: "", originalPrice: "",
  category: "", brand: "", unit: "", images: "", tags: "",
  badge: "" as ProductBadge | "", inStock: true,
  vendorId: "", vendorName: "",
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
  const [saving, setSaving]       = useState(false);
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
    if (debouncedMinPrice && debouncedMaxPrice) {
      qs.set("minPrice", debouncedMinPrice);
      qs.set("maxPrice", debouncedMaxPrice);
    }
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
    setEditing(p);
    setError("");
    setModal("edit");
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
    await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: authHeader });
    void load();
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
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 380px)" }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                {["Product", "Vendor", "Category", "Price", "Badge", "Stock", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.products.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No products found</td></tr>
              ) : data?.products.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30" data-testid="product-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        <Image src={p.images[0] ?? "/images/placeholder-product.webp"} alt={p.name} fill className="object-contain p-1" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{p.name}</p>
                        <p className="text-xs text-gray-400 truncate">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.vendorName
                      ? <span className="text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{p.vendorName}</span>
                      : <span className="text-gray-300 dark:text-gray-600 text-xs">Platform</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-gray-900 dark:text-gray-100">₹{p.price.toFixed(0)}</span>
                    {p.originalPrice && <span className="ml-1 text-xs text-gray-400 line-through">₹{p.originalPrice.toFixed(0)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.badge
                      ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGE_COLORS[p.badge] ?? ""}`}>{p.badge}</span>
                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {p.inStock ? "In Stock" : "Out"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[p.status ?? "approved"] ?? ""}`}>
                      {p.status ?? "approved"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {(p.status === "pending" || p.status === "rejected") && (
                        <button
                          onClick={() => handleApproval(p._id, "approved")}
                          disabled={approving === p._id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors disabled:opacity-50"
                          title="Approve"
                          data-testid={`approve-product-${p._id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {(p.status === "pending" || p.status === "approved") && (
                        <button
                          onClick={() => handleApproval(p._id, "rejected")}
                          disabled={approving === p._id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                          title="Reject"
                          data-testid={`reject-product-${p._id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#0F4C75] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        data-testid={`edit-product-${p._id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        data-testid={`delete-product-${p._id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500" data-testid="pagination-info">
              Page {data.page} of {data.totalPages} · {data.total} products
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                data-testid="prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                data-testid="next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">{editing ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
              {(["name", "description", "category", "brand", "unit"] as const).map((field) => (
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
