"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Check, Loader2, Layers, LayoutTemplate } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils/cn";
import { authClient } from "@/lib/axios";
import type { HomepageSection, SectionType } from "@/types";

const SECTION_TYPES: SectionType[] = [
  "product-carousel", "offer-cards", "brand-inspiration", "info-cards",
  "category-tiles", "brand-grid", "explore-cards", "hero-banner",
];

const TYPE_LABEL: Record<SectionType, string> = {
  "product-carousel":  "Product Carousel",
  "offer-cards":       "Offer Cards",
  "brand-inspiration": "Brand Inspiration",
  "info-cards":        "Info Cards",
  "category-tiles":    "Category Tiles",
  "brand-grid":        "Brand Grid",
  "explore-cards":     "Explore Cards",
  "hero-banner":       "Hero Banner",
};

const TYPE_COLOR: Record<SectionType, string> = {
  "product-carousel":  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "offer-cards":       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "brand-inspiration": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "info-cards":        "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  "category-tiles":    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "brand-grid":        "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "explore-cards":     "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "hero-banner":       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const EMPTY_FORM = {
  key: "", title: "", subtitle: "", type: "product-carousel" as SectionType,
  isActive: true, order: 0, ctaLabel: "", ctaHref: "",
};

type FormState = typeof EMPTY_FORM;

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#0F4C75] focus:ring-1 focus:ring-[#0F4C75]";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1";

export default function AdminHomepageSectionsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [sections,  setSections]  = useState<HomepageSection[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<HomepageSection | null>(null);
  const [form,      setForm]      = useState<FormState>({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [moving,    setMoving]    = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [seeding,   setSeeding]   = useState(false);
  const [seedMsg,   setSeedMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  useScrollLock(showForm);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authClient(token!).get<{ success: boolean; data: HomepageSection[] }>(
        "/api/admin/homepage-sections"
      );
      if (data.success) setSections(data.data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, order: sections.length });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(s: HomepageSection) {
    setEditing(s);
    setForm({
      key: s.key, title: s.title, subtitle: s.subtitle ?? "",
      type: s.type, isActive: s.isActive, order: s.order,
      ctaLabel: s.ctaLabel ?? "", ctaHref: s.ctaHref ?? "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError("Title is required"); return; }
    if (!form.key.trim())   { setFormError("Key is required"); return; }
    if (!/^[a-z0-9-]+$/.test(form.key)) {
      setFormError("Key must be lowercase letters, numbers and hyphens only");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      key:      form.key.trim(),
      title:    form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      type:     form.type,
      isActive: form.isActive,
      order:    form.order,
      ctaLabel: form.ctaLabel.trim() || undefined,
      ctaHref:  form.ctaHref.trim() || undefined,
    };
    try {
      if (editing) {
        await authClient(token!).patch(`/api/admin/homepage-sections/${editing._id}`, payload);
      } else {
        await authClient(token!).post("/api/admin/homepage-sections", payload);
      }
      setShowForm(false);
      void load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this homepage section? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await authClient(token!).delete(`/api/admin/homepage-sections/${id}`);
      setSections((prev) => prev.filter((s) => s._id !== id));
    } catch {
      void load();
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleActive(s: HomepageSection) {
    setSections((prev) => prev.map((x) => x._id === s._id ? { ...x, isActive: !x.isActive } : x));
    try {
      await authClient(token!).patch(`/api/admin/homepage-sections/${s._id}`, { isActive: !s.isActive });
    } catch {
      void load();
    }
  }

  async function handleMove(id: string, dir: "up" | "down") {
    const idx = sections.findIndex((s) => s._id === id);
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const curr = sections[idx]!;
    const nbr  = sections[targetIdx]!;

    setSections((prev) => {
      const next = [...prev];
      next[idx]       = { ...curr, order: nbr.order };
      next[targetIdx] = { ...nbr,  order: curr.order };
      return [...next].sort((a, b) => a.order - b.order);
    });

    setMoving(id);
    try {
      await Promise.all([
        authClient(token!).patch(`/api/admin/homepage-sections/${curr._id}`, { order: nbr.order }),
        authClient(token!).patch(`/api/admin/homepage-sections/${nbr._id}`,  { order: curr.order }),
      ]);
    } catch {
      void load();
    } finally {
      setMoving(null);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const { data } = await authClient(token!).post<{ message?: string; error?: string }>(
        "/api/homepage/sections/seed"
      );
      setSeedMsg({ ok: true, text: data.message ?? "Seeded successfully." });
      void load();
    } catch {
      setSeedMsg({ ok: false, text: "Seed failed — check server logs." });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Homepage Sections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {sections.length} section{sections.length !== 1 ? "s" : ""} · {sections.filter((s) => s.isActive).length} active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => void handleSeed()}
            disabled={seeding}
            data-testid="seed-sections-btn"
            title="Upsert the 10 default homepage sections (safe to re-run)"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            Seed Defaults
          </button>
          <button
            onClick={openCreate}
            data-testid="add-section-btn"
            className="flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0a3a5c] transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Section
          </button>
        </div>
      </div>

      {/* Seed message */}
      {seedMsg && (
        <div className={cn("flex items-start gap-2 px-4 py-3 rounded-lg text-sm font-medium",
          seedMsg.ok
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
            : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
        )}>
          {seedMsg.ok ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : <X className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{seedMsg.text}</span>
          <button onClick={() => setSeedMsg(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Section cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutTemplate className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No sections yet</p>
          <p className="text-gray-400 text-sm mt-1">Click &ldquo;Seed Defaults&rdquo; to populate the homepage or add one manually.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="sections-list">
          {sections.map((s, idx) => (
            <div
              key={s._id}
              data-testid={`section-card-${s.key}`}
              className={cn(
                "bg-white dark:bg-gray-900 rounded-xl border px-4 py-3.5",
                "flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap",
                s.isActive
                  ? "border-gray-100 dark:border-gray-800"
                  : "border-dashed border-gray-200 dark:border-gray-700 opacity-60"
              )}
            >
              {/* Order controls */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button
                  onClick={() => void handleMove(s._id, "up")}
                  disabled={idx === 0 || moving === s._id}
                  aria-label="Move section up"
                  className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 w-6 text-center">
                  {s.order}
                </span>
                <button
                  onClick={() => void handleMove(s._id, "down")}
                  disabled={idx === sections.length - 1 || moving === s._id}
                  aria-label="Move section down"
                  className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{s.title}</p>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", TYPE_COLOR[s.type])}>
                    {TYPE_LABEL[s.type]}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 shrink-0">{s.key}</span>
                </div>
                {s.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{s.subtitle}</p>
                )}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    {s.items.length} item{s.items.length !== 1 ? "s" : ""}
                  </span>
                  {s.ctaLabel && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[160px]">
                      CTA: {s.ctaLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Active toggle + actions */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <button
                  onClick={() => void handleToggleActive(s)}
                  data-testid={`toggle-active-${s.key}`}
                  aria-label={s.isActive ? "Deactivate section" : "Activate section"}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors",
                    s.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"
                  )}
                >
                  {s.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => openEdit(s)}
                  data-testid={`edit-section-${s.key}`}
                  aria-label="Edit section"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => void handleDelete(s._id)}
                  disabled={deleting === s._id}
                  data-testid={`delete-section-${s.key}`}
                  aria-label="Delete section"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {deleting === s._id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90dvh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {editing ? "Edit Section" : "Add Section"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              {/* Title + Key */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. What's new this week?"
                    className={inputCls}
                    data-testid="section-form-title"
                  />
                </div>
                <div>
                  <label className={labelCls}>Key (slug) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.key}
                    onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                    placeholder="e.g. whats-new"
                    className={cn(inputCls, "font-mono text-xs")}
                    data-testid="section-form-key"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div>
                <label className={labelCls}>Subtitle</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Short description shown below the title"
                  className={inputCls}
                  data-testid="section-form-subtitle"
                />
              </div>

              {/* Type + Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type <span className="text-red-500">*</span></label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SectionType }))}
                    className={inputCls}
                    data-testid="section-form-type"
                  >
                    {SECTION_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                    className={inputCls}
                    data-testid="section-form-order"
                  />
                </div>
              </div>

              {/* CTA Label + Href */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>CTA Label</label>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    placeholder="e.g. Shop all"
                    className={inputCls}
                    data-testid="section-form-cta-label"
                  />
                </div>
                <div>
                  <label className={labelCls}>CTA Href</label>
                  <input
                    type="text"
                    value={form.ctaHref}
                    onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                    placeholder="/products"
                    className={inputCls}
                    data-testid="section-form-cta-href"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="sr-only"
                    data-testid="section-form-active"
                  />
                  <div className={cn(
                    "w-10 h-5 rounded-full transition-colors",
                    form.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                  )} />
                  <div className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    form.isActive ? "translate-x-5" : "translate-x-0"
                  )} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {form.isActive ? "Active — visible on homepage" : "Inactive — hidden from homepage"}
                </span>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                data-testid="section-form-submit"
                className="flex-1 py-2.5 rounded-xl bg-[#0F4C75] text-white text-sm font-semibold hover:bg-[#0a3a5c] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Section"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
