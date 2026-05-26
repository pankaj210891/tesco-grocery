"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X, Package, AlertTriangle, Layers, Trash2, Search, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import { ProductsTable } from "@/components/common/ProductsTable";
import DynamicAttributeFields from "@/components/product/DynamicAttributeFields";
import NumberInput from "@/components/ui/NumberInput";
import type { Product, ProductBadge, ProductVariant } from "@/types";
import { useScrollLock } from "@/hooks/useScrollLock";

interface PageData {
  products:   Product[];
  total:      number;
  page:       number;
  totalPages: number;
}

const EMPTY_FORM = {
  name:          "",
  slug:          "",
  description:   "",
  price:         "",
  originalPrice: "",
  category:      "",
  brand:         "",
  unit:          "",
  images:        "",
  tags:          "",
  badge:         "" as ProductBadge | "",
  // inventory
  trackStock:        false,
  stockQuantity:     "",
  lowStockThreshold: "5",
  inStock:           true,
};

interface VariantForm {
  label:         string;
  sku:           string;
  price:         string;
  originalPrice: string;
  inStock:       boolean;
}

const EMPTY_VARIANT: VariantForm = { label: "", sku: "", price: "", originalPrice: "", inStock: true };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const inputCls =
  "w-full px-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase mb-1 tracking-wide capitalize";

export default function VendorProductsPage() {
  const { user, token } = useAuthStore();
  const router      = useRouter();
  const searchParams = useSearchParams();

  const [data, setData]             = useState<PageData | null>(null);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterInStock, setFilterInStock]   = useState(() => searchParams.get("inStock") ?? "");
  const [filterBadge, setFilterBadge]       = useState("");
  const [sortBy, setSortBy]         = useState("newest");
  const [loading, setLoading]       = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [modal, setModal]           = useState<"add" | "edit" | null>(null);
  const [editing, setEditing]       = useState<Product | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [formAttrs, setFormAttrs]   = useState<Record<string, string>>({});
  const [formVariants, setFormVariants] = useState<VariantForm[]>([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  useScrollLock(modal !== null);

  const loadCategories = useCallback(async () => {
    if (!token) return;
    authClient(token)
      .get<ApiResponse<string[]>>("/api/vendor/products/categories")
      .then((r) => { if (r.data.data) setCategories(r.data.data); })
      .catch(() => { /* non-critical */ });
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "20" });
      if (search)        qs.set("search",   search);
      if (filterCategory) qs.set("category", filterCategory);
      if (filterInStock)  qs.set("inStock",  filterInStock);
      if (filterBadge)    qs.set("badge",    filterBadge);
      if (sortBy !== "newest") qs.set("sortBy", sortBy);

      const client = authClient(token);
      const res    = await client.get<ApiResponse<PageData>>(
        `/api/vendor/products?${qs.toString()}`,
      );
      if (res.data.data) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [page, token, search, filterCategory, filterInStock, filterBadge, sortBy]);

  useEffect(() => {
    if (!user)                                             { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin")   { router.push("/");     return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void loadCategories();
  }, [user, router, load, loadCategories]);

  function updateSearch(v: string)         { setSearch(v);         setPage(1); }
  function updateFilterCategory(v: string) { setFilterCategory(v); setPage(1); }
  function updateFilterInStock(v: string)  { setFilterInStock(v);  setPage(1); }
  function updateFilterBadge(v: string)    { setFilterBadge(v);    setPage(1); }
  function updateSortBy(v: string)         { setSortBy(v);         setPage(1); }

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setFormAttrs({});
    setFormVariants([]);
    setEditing(null);
    setError("");
    setModal("add");
  }

  function openEdit(p: Product) {
    const tracked = p.stockQuantity != null;
    setForm({
      name:              p.name,
      slug:              p.slug,
      description:       p.description,
      price:             String(p.price),
      originalPrice:     String(p.originalPrice ?? ""),
      category:          p.category,
      brand:             p.brand,
      unit:              p.unit,
      images:            p.images.join(", "),
      tags:              p.tags.join(", "),
      badge:             p.badge ?? "",
      trackStock:        tracked,
      stockQuantity:     tracked ? String(p.stockQuantity) : "",
      lowStockThreshold: String(p.lowStockThreshold ?? 5),
      inStock:           p.inStock,
    });
    setFormAttrs(p.attributes ?? {});
    setFormVariants(
      (p.variants ?? []).map((v: ProductVariant) => ({
        label:         v.label,
        sku:           v.sku,
        price:         v.price != null ? String(v.price) : "",
        originalPrice: v.originalPrice != null ? String(v.originalPrice) : "",
        inStock:       v.inStock,
      }))
    );
    setEditing(p);
    setError("");
    setModal("edit");
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const client = authClient(token!);

      const stockQuantity =
        form.trackStock && form.stockQuantity !== ""
          ? Number(form.stockQuantity)
          : null;

      const body = {
        name:          form.name,
        slug:          form.slug,
        description:   form.description,
        price:         Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        category:      form.category,
        brand:         form.brand,
        unit:          form.unit,
        images:        form.images.split(",").map((s) => s.trim()).filter(Boolean),
        tags:          form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        badge:         form.badge || null,
        // inventory
        stockQuantity,
        lowStockThreshold: form.trackStock ? Number(form.lowStockThreshold) : 5,
        inStock:           stockQuantity !== null ? stockQuantity > 0 : form.inStock,
        attributes:    Object.fromEntries(
          Object.entries(formAttrs).filter(([, v]) => v.trim() !== ""),
        ),
        variants: formVariants
          .filter((v) => v.label.trim())
          .map((v) => ({
            label:         v.label.trim(),
            sku:           v.sku.trim(),
            price:         v.price !== "" ? Number(v.price) : null,
            originalPrice: v.originalPrice !== "" ? Number(v.originalPrice) : null,
            stockQuantity: null,
            inStock:       v.inStock,
          })),
      };

      if (editing) {
        await client.put(`/api/vendor/products/${editing._id}`, body);
      } else {
        await client.post("/api/vendor/products", body);
      }

      setModal(null);
      void load();
      void loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await authClient(token!).delete(`/api/vendor/products/${id}`);
      void load();
      void loadCategories();
    } catch {
      setError("Failed to delete product. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">My Products</h1>
        <button
          onClick={openAdd}
          data-testid="add-product-btn"
          className="flex items-center gap-2 px-4 py-2 bg-[#1a7a4a] text-white text-sm font-semibold rounded-lg hover:bg-[#145e38] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="Search products…"
              data-testid="vendor-product-search"
              className="w-full pl-9 pr-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
            />
          </div>

          {/* Category */}
          <select
            value={filterCategory}
            onChange={(e) => updateFilterCategory(e.target.value)}
            data-testid="vendor-category-filter"
            className="text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Badge */}
          <select
            value={filterBadge}
            onChange={(e) => updateFilterBadge(e.target.value)}
            data-testid="vendor-badge-filter"
            className="text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
          >
            <option value="">All Badges</option>
            {["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Stock */}
          <select
            value={filterInStock}
            onChange={(e) => updateFilterInStock(e.target.value)}
            data-testid="vendor-stock-filter"
            className="text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
          >
            <option value="">All Stock</option>
            <option value="true">In Stock</option>
            <option value="false">Out of Stock</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => updateSortBy(e.target.value)}
            data-testid="vendor-sort-filter"
            className="text-base md:text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="name-asc">Name A–Z</option>
          </select>

          {/* Clear */}
          {(search || filterCategory || filterInStock || filterBadge || sortBy !== "newest") && (
            <button
              onClick={() => { setSearch(""); setFilterCategory(""); setFilterInStock(""); setFilterBadge(""); setSortBy("newest"); setPage(1); }}
              data-testid="vendor-clear-filters"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-800 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {(search || filterCategory || filterInStock || filterBadge) && (
          <div className="flex flex-wrap gap-1.5">
            {search && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1a7a4a]/10 text-[#1a7a4a]">
                &ldquo;{search}&rdquo;
                <button onClick={() => updateSearch("")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filterCategory && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1a7a4a]/10 text-[#1a7a4a]">
                {filterCategory}
                <button onClick={() => updateFilterCategory("")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filterBadge && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1a7a4a]/10 text-[#1a7a4a]">
                {filterBadge}
                <button onClick={() => updateFilterBadge("")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filterInStock && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1a7a4a]/10 text-[#1a7a4a]">
                {filterInStock === "true" ? "In Stock" : "Out of Stock"}
                <button onClick={() => updateFilterInStock("")}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      <ProductsTable
        products={data?.products ?? []}
        loading={loading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onEdit={openEdit}
        onDelete={handleDelete}
        variant="vendor"
      />

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            data-testid="product-modal"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                {editing ? "Edit Product" : "Add Product"}
              </h2>
              <button onClick={() => setModal(null)} data-testid="close-modal">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Name */}
              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  data-testid="product-name-input"
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name: val,
                      ...(editing ? {} : { slug: slugify(val) }),
                    }));
                  }}
                  className={inputCls}
                />
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  data-testid="product-description-input"
                  onChange={(e) => set("description", e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Category */}
              <div>
                <label className={labelCls}>Category</label>
                <select
                  value={form.category}
                  data-testid="product-category-select"
                  onChange={(e) => {
                    set("category", e.target.value);
                    setFormAttrs({});
                  }}
                  className={inputCls}
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <DynamicAttributeFields
                category={form.category}
                values={formAttrs}
                onChange={setFormAttrs}
                accentColor="#1a7a4a"
              />

              {/* Brand / Unit / Slug */}
              {(["brand", "unit"] as const).map((field) => (
                <div key={field}>
                  <label className={labelCls}>{field}</label>
                  <input
                    type="text"
                    value={form[field]}
                    data-testid={`product-${field}-input`}
                    onChange={(e) => set(field, e.target.value)}
                    className={inputCls}
                  />
                </div>
              ))}

              <div>
                <label className={labelCls}>Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  data-testid="product-slug-input"
                  onChange={(e) => set("slug", e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Price (₹)</label>
                  <NumberInput
                    step="1"
                    min="0"
                    value={form.price}
                    data-testid="product-price-input"
                    onChange={(e) => set("price", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Original (₹)</label>
                  <NumberInput
                    step="1"
                    min="0"
                    value={form.originalPrice}
                    onChange={(e) => set("originalPrice", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* ── Inventory section ─────────────────────────────────── */}
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Inventory
                  </span>
                </div>

                {/* Track stock toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.trackStock}
                      data-testid="track-stock-toggle"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((f) => ({
                          ...f,
                          trackStock:    checked,
                          stockQuantity: checked ? f.stockQuantity : "",
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 peer-checked:bg-[#1a7a4a] rounded-full transition-colors" />
                    <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Track stock quantity
                  </span>
                </label>

                {form.trackStock ? (
                  /* Tracked inventory inputs */
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Stock Qty</label>
                      <NumberInput
                        min="0"
                        step="1"
                        value={form.stockQuantity}
                        data-testid="stock-quantity-input"
                        onChange={(e) => set("stockQuantity", e.target.value)}
                        placeholder="e.g. 50"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Low-stock alert</label>
                      <NumberInput
                        min="1"
                        step="1"
                        value={form.lowStockThreshold}
                        data-testid="low-stock-threshold-input"
                        onChange={(e) => set("lowStockThreshold", e.target.value)}
                        placeholder="e.g. 5"
                        className={inputCls}
                      />
                    </div>
                    {Number(form.stockQuantity) > 0 &&
                     Number(form.stockQuantity) <= Number(form.lowStockThreshold) && (
                      <div className="col-span-2 flex items-center gap-2 text-xs text-orange-600 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Stock is at or below the low-stock alert threshold
                      </div>
                    )}
                  </div>
                ) : (
                  /* Untracked — simple in/out toggle */
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="vInStock"
                      checked={form.inStock}
                      data-testid="in-stock-toggle"
                      onChange={(e) => set("inStock", e.target.checked)}
                      className="h-4 w-4 rounded accent-[#1a7a4a]"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      In Stock (unlimited / untracked)
                    </span>
                  </label>
                )}
              </div>

              {/* ── Variants section ─────────────────────────────────── */}
              <div
                className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30"
                data-testid="variants-section"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Variants
                    </span>
                    {formVariants.length > 0 && (
                      <span className="text-[10px] font-semibold bg-[#1a7a4a]/10 text-[#1a7a4a] rounded-full px-2 py-0.5">
                        {formVariants.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="add-variant-btn"
                    onClick={() => setFormVariants((vs) => [...vs, { ...EMPTY_VARIANT }])}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#1a7a4a] hover:text-[#145e38] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Variant
                  </button>
                </div>

                {formVariants.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    No variants — product has a single option. Add variants for sizes, colours, weights, etc.
                  </p>
                )}

                {formVariants.map((v, i) => (
                  <div
                    key={i}
                    data-testid={`variant-row-${i}`}
                    className="grid grid-cols-[1fr_auto] gap-2 items-start border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900"
                  >
                    <div className="space-y-2">
                      {/* Label + SKU */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>Label *</label>
                          <input
                            type="text"
                            value={v.label}
                            data-testid={`variant-label-${i}`}
                            placeholder="e.g. 500g, Red / M"
                            onChange={(e) =>
                              setFormVariants((vs) =>
                                vs.map((x, j) => j === i ? { ...x, label: e.target.value } : x)
                              )
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>SKU</label>
                          <input
                            type="text"
                            value={v.sku}
                            data-testid={`variant-sku-${i}`}
                            placeholder="Optional"
                            onChange={(e) =>
                              setFormVariants((vs) =>
                                vs.map((x, j) => j === i ? { ...x, sku: e.target.value } : x)
                              )
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>
                      {/* Price override */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>Price override (₹)</label>
                          <NumberInput
                            min="0"
                            step="1"
                            value={v.price}
                            data-testid={`variant-price-${i}`}
                            placeholder="Leave blank = product price"
                            onChange={(e) =>
                              setFormVariants((vs) =>
                                vs.map((x, j) => j === i ? { ...x, price: e.target.value } : x)
                              )
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Original price (₹)</label>
                          <NumberInput
                            min="0"
                            step="1"
                            value={v.originalPrice}
                            data-testid={`variant-original-price-${i}`}
                            placeholder="Optional"
                            onChange={(e) =>
                              setFormVariants((vs) =>
                                vs.map((x, j) => j === i ? { ...x, originalPrice: e.target.value } : x)
                              )
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>
                      {/* In stock */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.inStock}
                          data-testid={`variant-instock-${i}`}
                          onChange={(e) =>
                            setFormVariants((vs) =>
                              vs.map((x, j) => j === i ? { ...x, inStock: e.target.checked } : x)
                            )
                          }
                          className="h-3.5 w-3.5 rounded accent-[#1a7a4a]"
                        />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">In Stock</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      data-testid={`remove-variant-${i}`}
                      onClick={() => setFormVariants((vs) => vs.filter((_, j) => j !== i))}
                      className="mt-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Badge */}
              <div>
                <label className={labelCls}>Badge</label>
                <select
                  value={form.badge}
                  data-testid="product-badge-select"
                  onChange={(e) => set("badge", e.target.value as ProductBadge | "")}
                  className={inputCls}
                >
                  <option value="">None</option>
                  {["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Images */}
              <div>
                <label className={labelCls}>Images (URLs, comma-separated)</label>
                <input
                  type="text"
                  value={form.images}
                  onChange={(e) => set("images", e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Tags */}
              <div>
                <label className={labelCls}>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-6 flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-gray-900 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                data-testid="save-product-btn"
                className="px-4 py-2 text-sm font-semibold text-white bg-[#1a7a4a] rounded-lg hover:bg-[#145e38] disabled:opacity-50"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
