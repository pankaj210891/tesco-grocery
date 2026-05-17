"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search, X, Check, Loader2, Tag, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { useScrollLock } from "@/hooks/useScrollLock";

interface PromoCode {
  _id:                string;
  title:              string;
  code?:              string;
  discountType:       "percentage" | "fixed" | "freeDelivery";
  discountValue:      number;
  maxCap?:            number | null;
  minOrderValue:      number;
  expiresAt:          string;
  isActive:           boolean;
  usageLimit?:        number | null;
  usedCount:          number;
  perUserLimit?:      number | null;
  firstOrderOnly:     boolean;
  eligibleCategories: string[];
  badge?:             string;
  emoji?:             string;
  color?:             string;
}

const EMPTY_FORM = {
  title: "", code: "", discountType: "percentage" as "percentage" | "fixed" | "freeDelivery",
  discountValue: "" as string | number, maxCap: "" as string | number,
  minOrderValue: "" as string | number, expiresAt: "",
  isActive: true, usageLimit: "" as string | number,
  perUserLimit: "" as string | number,
  firstOrderOnly: false,
  eligibleCategories: "",
  badge: "", emoji: "", color: "#EFF6FF",
};

const TYPE_LABELS: Record<string, string> = {
  percentage:   "Percentage %",
  fixed:        "Fixed ₹",
  freeDelivery: "Free Delivery",
};

function formatExpiry(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminPromoCodesPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [promos,    setPromos]    = useState<PromoCode[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState<"" | "active" | "expired" | "inactive">("");
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<PromoCode | null>(null);
  useScrollLock(showForm);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [allCategories, setAllCategories] = useState<{ name: string; slug: string; emoji: string }[]>([]);
  const [showCatDrop,   setShowCatDrop]   = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("q",      search);
      if (status) qs.set("status", status);
      const res  = await fetch(`/api/admin/promocodes${qs.size ? `?${qs}` : ""}`, { headers: authHeader });
      const json = await res.json() as { success: boolean; data: PromoCode[] };
      if (json.success) setPromos(json.data);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!showForm || allCategories.length > 0) return;
    fetch("/api/admin/categories", { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: { name: string; slug: string; emoji: string }[] }>)
      .then((j) => { if (j.success) setAllCategories(j.data); })
      .catch(() => { /* non-critical */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  function selectedCats(): string[] {
    return form.eligibleCategories
      ? form.eligibleCategories.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  }

  function toggleCategory(slug: string) {
    const current = selectedCats();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    setFv("eligibleCategories", next.join(", "));
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setShowCatDrop(false);
    setShowForm(true);
  }

  function openEdit(p: PromoCode) {
    setEditing(p);
    setForm({
      title:              p.title,
      code:               p.code ?? "",
      discountType:       p.discountType,
      discountValue:      String(p.discountValue),
      maxCap:             p.maxCap ?? "",
      minOrderValue:      String(p.minOrderValue),
      expiresAt:          toLocalDatetime(p.expiresAt),
      isActive:           p.isActive,
      usageLimit:         p.usageLimit ?? "",
      perUserLimit:       p.perUserLimit ?? "",
      firstOrderOnly:     p.firstOrderOnly,
      eligibleCategories: p.eligibleCategories.join(", "),
      badge:              p.badge ?? "",
      emoji:              p.emoji ?? "",
      color:              p.color ?? "#EFF6FF",
    });
    setFormError("");
    setShowCatDrop(false);
    setShowForm(true);
  }

  function fv(key: string): string | number | boolean {
    return (form as Record<string, string | number | boolean>)[key];
  }

  function setFv(key: string, value: string | number | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Title is required"); return; }
    if (!form.expiresAt)    { setFormError("Expiry date is required"); return; }
    if (form.discountType !== "freeDelivery" && !form.discountValue) {
      setFormError("Discount value is required"); return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        code:               form.code || undefined,
        discountValue:      Number(form.discountValue) || 0,
        minOrderValue:      Number(form.minOrderValue) || 0,
        maxCap:             form.maxCap !== "" ? Number(form.maxCap) : null,
        usageLimit:         form.usageLimit !== "" ? Number(form.usageLimit) : null,
        perUserLimit:       form.perUserLimit !== "" ? Number(form.perUserLimit) : null,
        eligibleCategories: form.eligibleCategories
          ? form.eligibleCategories.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean)
          : [],
        expiresAt:          new Date(form.expiresAt).toISOString(),
        color:              form.color || "#EFF6FF",
      };

      const url    = editing ? `/api/admin/promocodes/${editing._id}` : "/api/admin/promocodes";
      const method = editing ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) { setFormError(json.error ?? "Save failed"); return; }
      setShowForm(false);
      void load();
    } catch {
      setFormError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this promo code? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/promocodes/${id}`, { method: "DELETE", headers: authHeader });
      void load();
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(p: PromoCode) {
    await fetch(`/api/admin/promocodes/${p._id}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    void load();
  }

  const isExpired = (iso: string) => new Date(iso) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Promo Codes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{promos.length} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0a3a5c] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Promo
        </button>
      </div>

      {/* Search + Status filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code…"
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]"
            data-testid="promo-search"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1" data-testid="promo-status-filters">
          {([["", "All"], ["active", "Active"], ["expired", "Expired"], ["inactive", "Inactive"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatus(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                status === val
                  ? "bg-[#0F4C75] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              data-testid={`promo-status-${val || "all"}`}
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
                {["Code", "Title", "Discount", "Cap", "Min Order", "Expiry", "Usage", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : promos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Tag className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No promo codes found</p>
                  </td>
                </tr>
              ) : promos.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#0F4C75] dark:text-blue-400">
                      {p.emoji && <span className="mr-1">{p.emoji}</span>}
                      {p.code ?? <span className="text-gray-400 font-normal italic">no code</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100 max-w-[160px] truncate">{p.title}</p>
                    {p.eligibleCategories.length > 0 && (
                      <p className="text-[11px] text-gray-400">{p.eligibleCategories.join(", ")}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full",
                      p.discountType === "freeDelivery" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" :
                      p.discountType === "percentage"   ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    )}>
                      {p.discountType === "freeDelivery" ? "Free Del." :
                       p.discountType === "percentage"   ? `${p.discountValue}%` :
                       formatPrice(p.discountValue)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {p.maxCap ? formatPrice(p.maxCap) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {p.minOrderValue > 0 ? formatPrice(p.minOrderValue) : "None"}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <span className={isExpired(p.expiresAt) ? "text-red-500" : "text-gray-500 dark:text-gray-400"}>
                      {formatExpiry(p.expiresAt)}
                      {isExpired(p.expiresAt) && " (expired)"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {p.usedCount}{p.usageLimit ? ` / ${p.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void toggleActive(p)}
                      className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors",
                        p.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"
                      )}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDelete(p._id)}
                        disabled={deleting === p._id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === p._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl p-6 overflow-y-auto max-h-[90dvh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {editing ? "Edit Promo Code" : "Add Promo Code"}
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
              {/* Title + Code */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title *</label>
                  <input type="text" value={String(fv("title"))} onChange={(e) => setFv("title", e.target.value)}
                    placeholder="e.g. 20% off groceries"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Code</label>
                  <input type="text" value={String(fv("code"))} onChange={(e) => setFv("code", e.target.value.toUpperCase())}
                    placeholder="e.g. SAVE20"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:outline-none focus:border-[#0F4C75]" />
                </div>
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type *</label>
                  <div className="relative">
                    <select value={String(fv("discountType"))} onChange={(e) => setFv("discountType", e.target.value)}
                      className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75] cursor-pointer">
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {fv("discountType") === "percentage" ? "% Value" : "₹ Value"}
                  </label>
                  <input type="number" min={0} value={String(fv("discountValue"))} onChange={(e) => setFv("discountValue", e.target.value)}
                    disabled={fv("discountType") === "freeDelivery"}
                    className="no-spinner w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75] disabled:opacity-50" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Max Cap ₹</label>
                  <input type="number" min={0} value={String(fv("maxCap"))} onChange={(e) => setFv("maxCap", e.target.value)}
                    placeholder="optional"
                    disabled={fv("discountType") !== "percentage"}
                    className="no-spinner w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75] disabled:opacity-50" />
                </div>
              </div>

              {/* Min Order + Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Min Order ₹</label>
                  <input type="number" min={0} value={String(fv("minOrderValue"))} onChange={(e) => setFv("minOrderValue", e.target.value)}
                    className="no-spinner w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expires At *</label>
                  <input type="datetime-local" value={String(fv("expiresAt"))} onChange={(e) => setFv("expiresAt", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]" />
                </div>
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Usage Limit</label>
                  <input type="number" min={0} value={String(fv("usageLimit"))} onChange={(e) => setFv("usageLimit", e.target.value)}
                    placeholder="unlimited"
                    className="no-spinner w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Per User Limit</label>
                  <input type="number" min={0} value={String(fv("perUserLimit"))} onChange={(e) => setFv("perUserLimit", e.target.value)}
                    placeholder="unlimited"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]" />
                </div>
              </div>

              {/* Eligible categories — multi-select dropdown */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Eligible Categories <span className="font-normal normal-case">(blank = all)</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCatDrop((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-left focus:outline-none focus:border-[#0F4C75]"
                  >
                    <span className={selectedCats().length === 0 ? "text-gray-400" : "text-gray-900 dark:text-white"}>
                      {selectedCats().length === 0
                        ? "All categories"
                        : `${selectedCats().length} selected: ${selectedCats().map((s) => allCategories.find((c) => c.slug === s)?.name ?? s).join(", ")}`}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform shrink-0", showCatDrop && "rotate-180")} />
                  </button>

                  {showCatDrop && (
                    <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-y-auto max-h-48">
                      {allCategories.length === 0 ? (
                        <li className="px-3 py-3 text-xs text-gray-400 text-center">Loading categories…</li>
                      ) : allCategories.map((c) => {
                        const checked = selectedCats().includes(c.slug);
                        return (
                          <li key={c.slug}>
                            <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCategory(c.slug)}
                                className="accent-[#0F4C75] h-4 w-4 rounded"
                              />
                              <span className="text-sm">{c.emoji}</span>
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                              <span className="text-xs text-gray-400 ml-auto">{c.slug}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Emoji + Badge + Color */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Emoji</label>
                  <input type="text" value={String(fv("emoji"))} onChange={(e) => setFv("emoji", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75] text-center text-xl" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Badge label</label>
                  <input type="text" value={String(fv("badge"))} onChange={(e) => setFv("badge", e.target.value)}
                    placeholder="e.g. HOT, NEW"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#0F4C75]" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Card Color</label>
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <input type="color" value={String(fv("color"))} onChange={(e) => setFv("color", e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{String(fv("color"))}</span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                {([["isActive", "Active"], ["firstOrderOnly", "First order only"]] as [string, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <div onClick={() => setFv(key, !fv(key))}
                      className={cn("w-9 h-5 rounded-full transition-colors relative shrink-0",
                        fv(key) ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                      )}>
                      <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        fv(key) ? "translate-x-4" : "translate-x-0.5")} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => void handleSave()} disabled={saving}
                className="flex-1 py-2.5 bg-[#0F4C75] text-white text-sm font-semibold rounded-xl hover:bg-[#0a3a5c] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" /> {editing ? "Save changes" : "Create"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
