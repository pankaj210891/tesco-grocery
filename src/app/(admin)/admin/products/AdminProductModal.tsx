"use client";

import { Plus, X, Trash2 } from "lucide-react";
import DynamicAttributeFields from "@/components/product/DynamicAttributeFields";
import NumberInput from "@/components/ui/NumberInput";
import type { Product, ProductBadge, Vendor } from "@/types";

export type AttrMap = Record<string, string>;

export interface VariantRow {
  label: string; sku: string;
  price: string; originalPrice: string;
  stockQuantity: string; inStock: boolean;
}

export const EMPTY_VARIANT: VariantRow = {
  label: "", sku: "", price: "", originalPrice: "", stockQuantity: "", inStock: true,
};

export type FormState = {
  name: string; slug: string; description: string; price: string; originalPrice: string;
  category: string; brand: string; unit: string; images: string; tags: string;
  badge: ProductBadge | ""; inStock: boolean; vendorId: string; vendorName: string;
};

export const EMPTY_FORM: FormState = {
  name: "", slug: "", description: "", price: "", originalPrice: "",
  category: "", brand: "", unit: "", images: "", tags: "",
  badge: "" as ProductBadge | "", inStock: true,
  vendorId: "", vendorName: "",
};

interface AdminProductModalProps {
  editing:         Product | null;
  form:            FormState;
  setForm:         React.Dispatch<React.SetStateAction<FormState>>;
  formAttrs:       AttrMap;
  setFormAttrs:    React.Dispatch<React.SetStateAction<AttrMap>>;
  variants:        VariantRow[];
  setVariants:     React.Dispatch<React.SetStateAction<VariantRow[]>>;
  categories:      string[];
  activeVendors:   Pick<Vendor, "_id" | "name">[];
  error:           string;
  saving:          boolean;
  onClose:         () => void;
  onSave:          () => void;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminProductModal({
  editing, form, setForm,
  formAttrs, setFormAttrs, variants, setVariants,
  categories, activeVendors, error, saving, onClose, onSave,
}: AdminProductModalProps) {
  function updateVariant(idx: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="add-product-modal">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">{editing ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
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
              onChange={(e) => { setForm((f) => ({ ...f, category: e.target.value })); setFormAttrs({}); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
              data-testid="product-category-select"
            >
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <DynamicAttributeFields
            category={form.category}
            values={formAttrs}
            onChange={setFormAttrs}
            accentColor="#0F4C75"
          />

          {(["brand", "unit"] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 capitalize">{field}</label>
              <input type="text" value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
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
              <NumberInput step="1" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Original Price (₹)</label>
              <NumberInput step="0.01" min="0" value={form.originalPrice} onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Badge</label>
            <select value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value as ProductBadge | "" }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]">
              <option value="">None</option>
              {["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE", "SALE"].map((b) => <option key={b} value={b}>{b}</option>)}
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
                setForm((f) => ({ ...f, vendorId: e.target.value, vendorName: selected?.name ?? "" }));
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
              data-testid="vendor-select"
            >
              <option value="">Platform (No Vendor)</option>
              {activeVendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
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

          {/* Variants */}
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
                  <input type="text" value={v.label} onChange={(e) => updateVariant(idx, { label: e.target.value })} placeholder="e.g. 500g, Red, XL"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">SKU</label>
                  <input type="text" value={v.sku} onChange={(e) => updateVariant(idx, { sku: e.target.value })} placeholder="VAR-001"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Stock</label>
                  <NumberInput min="0" value={v.stockQuantity} onChange={(e) => updateVariant(idx, { stockQuantity: e.target.value })} placeholder="0"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Price (₹)</label>
                  <NumberInput min="0" value={v.price} onChange={(e) => updateVariant(idx, { price: e.target.value })} placeholder="0"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Sale Price (₹)</label>
                  <NumberInput min="0" value={v.originalPrice} onChange={(e) => updateVariant(idx, { originalPrice: e.target.value })} placeholder="Optional"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id={`variant-instock-${idx}`} checked={v.inStock} onChange={(e) => updateVariant(idx, { inStock: e.target.checked })} className="h-3.5 w-3.5 rounded" />
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
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-[#0F4C75] rounded-lg hover:bg-[#0A3352] disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
