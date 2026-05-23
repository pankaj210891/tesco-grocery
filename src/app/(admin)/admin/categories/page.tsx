"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search, X, Check, Loader2, FolderOpen, Layers } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient, apiClient } from "@/lib/axios";
import { cn } from "@/lib/utils/cn";
import { useScrollLock } from "@/hooks/useScrollLock";
import NumberInput from "@/components/ui/NumberInput";

interface Category {
  _id:          string;
  name:         string;
  slug:         string;
  emoji:        string;
  description:  string;
  color:        string;
  textColor:    string;
  order:        number;
  isActive:     boolean;
  productCount: number;
}

const EMPTY_FORM = {
  name: "", slug: "", emoji: "📦", description: "",
  color: "bg-gray-50", textColor: "text-gray-700", order: 0, isActive: true,
};

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [isActive,   setIsActive]   = useState<"" | "true" | "false">("");
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<Category | null>(null);
  useScrollLock(showForm);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [formError,  setFormError]  = useState("");
  const [seeding,    setSeeding]    = useState(false);
  const [seedMsg,    setSeedMsg]    = useState<{ ok: boolean; text: string } | null>(null);


  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search)   qs.set("q",        search);
      if (isActive) qs.set("isActive", isActive);
      const res = await authClient(token!).get<{ success: boolean; data: Category[] }>(`/api/admin/categories${qs.size ? `?${qs}` : ""}`);
      if (res.data.success) setCategories(res.data.data);
    } finally {
      setLoading(false);
    }
   
  }, [search, isActive, token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name, slug: cat.slug, emoji: cat.emoji,
      description: cat.description, color: cat.color,
      textColor: cat.textColor, order: cat.order, isActive: cat.isActive,
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError("Name and slug are required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const url = editing ? `/api/admin/categories/${editing._id}` : "/api/admin/categories";
      const res = editing
        ? await authClient(token!).put<{ success: boolean; error?: string }>(url, form)
        : await authClient(token!).post<{ success: boolean; error?: string }>(url, form);
      if (!res.data.success) { setFormError(res.data.error ?? "Save failed"); return; }
      setShowForm(false);
      void load();
    } catch {
      setFormError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await authClient(token!).delete(`/api/admin/categories/${id}`);
      void load();
    } finally {
      setDeleting(null);
    }
  }

  async function handleSeedSubcategories() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await apiClient.post<{ success: boolean; inserted?: number; skipped?: number; message?: string; error?: string }>("/api/categories/tree/seed");
      if (res.data.success) {
        setSeedMsg({ ok: true, text: res.data.message ?? `Inserted ${res.data.inserted ?? 0} sub-categories.` });
        void load();
      } else {
        setSeedMsg({ ok: false, text: res.data.error ?? "Seed failed." });
      }
    } catch {
      setSeedMsg({ ok: false, text: "Network error — seed request failed." });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{categories.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleSeedSubcategories()}
            disabled={seeding}
            title="Insert level-1 and level-2 sub-categories into the database (safe to re-run)"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            Seed Sub-Categories
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0a3a5c] transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm font-medium ${seedMsg.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
          {seedMsg.ok ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : <X className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{seedMsg.text}</span>
          <button onClick={() => setSeedMsg(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Search + Status filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
            data-testid="category-search"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1" data-testid="category-status-filters">
          {([["", "All"], ["true", "Active"], ["false", "Inactive"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setIsActive(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive === val
                  ? "bg-[#0F4C75] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              data-testid={`category-status-${val || "all"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                {["", "Name", "Slug", "Order", "Products", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <FolderOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No categories found</p>
                  </td>
                </tr>
              ) : categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-2xl">{cat.emoji}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{cat.name}</p>
                    {cat.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{cat.description}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{cat.slug}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{cat.order}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{cat.productCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", cat.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDelete(cat._id)}
                        disabled={deleting === cat._id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === cat._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90dvh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {editing ? "Edit Category" : "Add Category"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editing ? f.slug : toSlug(e.target.value) }))}
                    placeholder="e.g. Fresh Food"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Emoji</label>
                  <input
                    type="text"
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75] text-center text-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="e.g. fresh-food"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:outline-none focus:border-[#0F4C75]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Short description…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-[#0F4C75]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Display Order</label>
                  <NumberInput
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bg Color</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="bg-gray-50"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Text Color</label>
                  <input
                    type="text"
                    value={form.textColor}
                    onChange={(e) => setForm((f) => ({ ...f, textColor: e.target.value }))}
                    placeholder="text-gray-700"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={cn(
                    "w-10 h-6 rounded-full transition-colors relative shrink-0",
                    form.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600",
                  )}
                >
                  <span className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    form.isActive ? "translate-x-5" : "translate-x-1",
                  )} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#0F4C75] text-white text-sm font-semibold rounded-xl hover:bg-[#0a3a5c] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" /> {editing ? "Save changes" : "Create"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
