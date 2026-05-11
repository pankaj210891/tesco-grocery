"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth.store";
import type { Product, ProductBadge } from "@/types";

interface PageData { products: Product[]; total: number; page: number; totalPages: number; }

const BADGE_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700", HOT: "bg-red-100 text-red-700",
  LIMITED: "bg-orange-100 text-orange-700", ORGANIC: "bg-green-100 text-green-700", EXCLUSIVE: "bg-purple-100 text-purple-700",
};

const EMPTY = { name:"", slug:"", description:"", price:"", originalPrice:"", category:"", brand:"", unit:"", images:"", tags:"", badge:"" as ProductBadge | "", inStock: true };
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export default function VendorProductsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [data, setData]       = useState<PageData | null>(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm]       = useState({ ...EMPTY });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const authHeader = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    fetch(`/api/vendor/products?page=${page}&limit=20`, { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: PageData }>)
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin") { router.push("/"); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  function openEdit(p: Product) {
    setForm({ name: p.name, slug: p.slug, description: p.description, price: String(p.price), originalPrice: String(p.originalPrice ?? ""), category: p.category, brand: p.brand, unit: p.unit, images: p.images.join(", "), tags: p.tags.join(", "), badge: p.badge ?? "", inStock: p.inStock });
    setEditing(p); setError(""); setModal("edit");
  }

  async function handleSave() {
    setSaving(true); setError("");
    const body = { name: form.name, slug: form.slug, description: form.description, price: Number(form.price), originalPrice: form.originalPrice ? Number(form.originalPrice) : null, category: form.category, brand: form.brand, unit: form.unit, images: form.images.split(",").map((s) => s.trim()).filter(Boolean), tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean), badge: form.badge || null, inStock: form.inStock };
    const url    = editing ? `/api/vendor/products/${editing._id}` : "/api/vendor/products";
    const method = editing ? "PUT" : "POST";
    const res    = await fetch(url, { method, headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json   = await res.json() as { success: boolean; error?: string };
    setSaving(false);
    if (!json.success) { setError(json.error ?? "Failed"); return; }
    setModal(null); load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/vendor/products/${id}`, { method: "DELETE", headers: authHeader });
     
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">My Products</h1>
        <button onClick={() => { setForm({ ...EMPTY }); setEditing(null); setError(""); setModal("add"); }} className="flex items-center gap-2 px-4 py-2 bg-[#1a7a4a] text-white text-sm font-semibold rounded-lg hover:bg-[#145e38] transition-colors">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
              <tr>{["Product","Category","Price","Badge","Stock","Actions"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>)
              : data?.products.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No products yet. Add your first product!</td></tr>
              : data?.products.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        <Image src={p.images[0] ?? "/images/placeholder-product.png"} alt={p.name} fill className="object-contain p-1" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">£{p.price.toFixed(2)}</td>
                  <td className="px-4 py-3">{p.badge ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGE_COLORS[p.badge] ?? ""}`}>{p.badge}</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{p.inStock ? "In Stock" : "Out"}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a7a4a] hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(p._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {data.page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">{editing ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
              {(["name","description","category","brand","unit"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 capitalize">{field}</label>
                  {field === "description" ? (
                    <textarea rows={3} value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] resize-none" />
                  ) : (
                    <input type="text" value={form[field]} onChange={(e) => { const val = e.target.value; setForm((f) => ({ ...f, [field]: val, ...(field === "name" && !editing ? { slug: slugify(val) } : {}) })); }} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]" />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Slug</label>
                <input type="text" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Price (£)</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Original (£)</label>
                  <input type="number" step="0.01" min="0" value={form.originalPrice} onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Badge</label>
                <select value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value as ProductBadge | "" }))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none">
                  <option value="">None</option>
                  {["NEW","HOT","LIMITED","ORGANIC","EXCLUSIVE"].map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Images (URLs, comma-separated)</label>
                <input type="text" value={form.images} onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="vInStock" checked={form.inStock} onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))} className="h-4 w-4 rounded" />
                <label htmlFor="vInStock" className="text-sm font-medium text-gray-700 dark:text-gray-300">In Stock</label>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-[#1a7a4a] rounded-lg hover:bg-[#145e38] disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
