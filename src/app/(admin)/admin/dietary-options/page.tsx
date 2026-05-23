"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search, X, Check, Loader2, Leaf, Layers } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils/cn";
import NumberInput from "@/components/ui/NumberInput";
import type { DietaryOption } from "@/types";

const EMPTY_FORM = {
  value:    "",
  label:    "",
  emoji:    "🥗",
  isActive: true,
  order:    0,
};

function toValue(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminDietaryOptionsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [options,   setOptions]   = useState<DietaryOption[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [isActive,  setIsActive]  = useState<"" | "true" | "false">("");
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<DietaryOption | null>(null);
  useScrollLock(showForm);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [seeding,   setSeeding]   = useState(false);
  const [seedMsg,   setSeedMsg]   = useState<{ ok: boolean; text: string } | null>(null);

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
      const res = await authClient(token!).get<{ success: boolean; data: DietaryOption[] }>(`/api/admin/dietary-options${qs.size ? `?${qs}` : ""}`);
      if (res.data.success) setOptions(res.data.data);
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

  function openEdit(opt: DietaryOption) {
    setEditing(opt);
    setForm({
      value:    opt.value,
      label:    opt.label,
      emoji:    opt.emoji,
      isActive: opt.isActive,
      order:    opt.order,
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.label.trim()) { setFormError("Label is required"); return; }
    if (!form.value.trim()) { setFormError("Value is required"); return; }
    if (!/^[a-z0-9-]+$/.test(form.value)) {
      setFormError("Value must be lowercase letters, numbers and hyphens only");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const url = editing ? `/api/admin/dietary-options/${editing._id}` : "/api/admin/dietary-options";
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
    if (!confirm("Delete this dietary option? Users who have it selected will keep it in their profile until they save again.")) return;
    setDeleting(id);
    try {
      await authClient(token!).delete(`/api/admin/dietary-options/${id}`);
      void load();
    } finally {
      setDeleting(null);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await authClient(token!).post<{ success: boolean; message?: string; error?: string }>("/api/admin/dietary-options/seed");
      if (res.data.success) {
        setSeedMsg({ ok: true, text: res.data.message ?? "Seeded successfully." });
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
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Dietary Options</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{options.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleSeed()}
            disabled={seeding}
            title="Insert the default 7 dietary options (safe to re-run — skips existing)"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            Seed Defaults
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0a3a5c] transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Option
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

      {/* Search + status filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dietary options…"
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
            data-testid="dietary-search"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1" data-testid="dietary-status-filters">
          {([["", "All"], ["true", "Active"], ["false", "Inactive"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setIsActive(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive === val
                  ? "bg-[#0F4C75] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              data-testid={`dietary-status-${val || "all"}`}
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
                {["", "Label", "Value", "Order", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : options.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Leaf className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No dietary options found</p>
                    <p className="text-gray-400 text-xs mt-1">Click &ldquo;Seed Defaults&rdquo; to add the standard options.</p>
                  </td>
                </tr>
              ) : options.map((opt) => (
                <tr key={opt._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30" data-testid={`dietary-row-${opt.value}`}>
                  <td className="px-4 py-3 text-2xl">{opt.emoji}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{opt.label}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{opt.value}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{opt.order}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", opt.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                      {opt.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(opt)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit"
                        data-testid={`dietary-edit-${opt.value}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDelete(opt._id)}
                        disabled={deleting === opt._id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Delete"
                        data-testid={`dietary-delete-${opt.value}`}
                      >
                        {deleting === opt._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90dvh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {editing ? "Edit Dietary Option" : "Add Dietary Option"}
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
              {/* Label + Emoji */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      label: e.target.value,
                      value: editing ? f.value : toValue(e.target.value),
                    }))}
                    placeholder="e.g. Vegan"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
                    data-testid="dietary-form-label"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Emoji</label>
                  <input
                    type="text"
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75] text-center text-xl"
                    data-testid="dietary-form-emoji"
                  />
                </div>
              </div>

              {/* Value (slug) */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Value (slug) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value.toLowerCase() }))}
                  placeholder="e.g. vegan"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:outline-none focus:border-[#0F4C75]"
                  data-testid="dietary-form-value"
                />
                <p className="text-[11px] text-gray-400">Lowercase letters, numbers, and hyphens only. Cannot be changed after users have selected it.</p>
              </div>

              {/* Order */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Display Order</label>
                <NumberInput
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
                  data-testid="dietary-form-order"
                />
              </div>

              {/* Active toggle */}
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active (visible to customers)</span>
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
                data-testid="dietary-form-submit"
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
