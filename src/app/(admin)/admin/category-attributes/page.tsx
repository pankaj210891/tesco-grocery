"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Trash2, Edit2, ChevronDown, ChevronUp,
  Tag, GripVertical, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import NumberInput from "@/components/ui/NumberInput";
import type { CategoryAttributes, AttributeDef, AttributeType } from "@/types";

const ATTR_TYPES: { value: AttributeType; label: string }[] = [
  { value: "select",      label: "Select (single)"  },
  { value: "multiselect", label: "Multiselect"       },
  { value: "text",        label: "Text"              },
  { value: "boolean",     label: "Boolean (Yes/No)"  },
  { value: "number",      label: "Number"            },
];

const EMPTY_ATTR: AttributeDef = {
  key: "", label: "", type: "select",
  filterable: true, searchable: false, required: false,
  options: [], order: 0,
};

const EMPTY_FORM = { category: "", label: "", isActive: true };

// ── Attribute row editor ─────────────────────────────────────────────────────

function AttrRow({
  attr, index, onChange, onRemove,
}: {
  attr: AttributeDef;
  index: number;
  onChange: (i: number, updated: AttributeDef) => void;
  onRemove: (i: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [optionInput, setOptionInput] = useState("");

  const update = (patch: Partial<AttributeDef>) => onChange(index, { ...attr, ...patch });

  function addOption() {
    const val = optionInput.trim();
    if (!val || attr.options.includes(val)) return;
    update({ options: [...attr.options, val] });
    setOptionInput("");
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60">
        <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
        <input
          value={attr.key}
          onChange={(e) => update({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
          placeholder="key (e.g. ram)"
          className="w-28 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0F4C75]"
          data-testid={`attr-key-${index}`}
        />
        <input
          value={attr.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Label (e.g. RAM)"
          className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0F4C75]"
          data-testid={`attr-label-${index}`}
        />
        <select
          value={attr.type}
          onChange={(e) => update({ type: e.target.value as AttributeType })}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#0F4C75]"
          data-testid={`attr-type-${index}`}
        >
          {ATTR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Toggle attribute options"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onRemove(index)}
          className="p-1 text-red-400 hover:text-red-600"
          aria-label="Remove attribute"
          data-testid={`remove-attr-${index}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="px-4 py-3 space-y-3 border-t border-gray-100 dark:border-gray-700">
          {/* Flags */}
          <div className="flex flex-wrap gap-4">
            {(
              [
                { field: "filterable" as const, label: "Filterable" },
                { field: "searchable" as const, label: "Searchable" },
                { field: "required"   as const, label: "Required"   },
              ] as const
            ).map(({ field, label }) => (
              <label key={field} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={attr[field]}
                  onChange={(e) => update({ [field]: e.target.checked })}
                  className="h-3.5 w-3.5 rounded accent-[#0F4C75]"
                  data-testid={`attr-${field}-${index}`}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
              </label>
            ))}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 dark:text-gray-400">Order:</label>
              <NumberInput
                min={0}
                value={attr.order}
                onChange={(e) => update({ order: Number(e.target.value) })}
                className="w-14 px-2 py-0.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none"
              />
            </div>
          </div>

          {/* Options (select/multiselect) */}
          {(attr.type === "select" || attr.type === "multiselect") && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Options</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attr.options.map((opt) => (
                  <span
                    key={opt}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                  >
                    {opt}
                    <button
                      onClick={() => update({ options: attr.options.filter((o) => o !== opt) })}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                  placeholder="Add option…"
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#0F4C75]"
                  data-testid={`attr-option-input-${index}`}
                />
                <button
                  onClick={addOption}
                  className="px-2 py-1 text-xs bg-[#0F4C75] text-white rounded-lg hover:bg-[#0A3352]"
                  data-testid={`attr-add-option-${index}`}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CategoryAttributesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [list, setList]             = useState<CategoryAttributes[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState<"add" | "edit" | null>(null);
  const [editing, setEditing]       = useState<CategoryAttributes | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [attrs, setAttrs]           = useState<AttributeDef[]>([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [deleting, setDeleting]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authClient(token).get<{ success: boolean; data: CategoryAttributes[] }>("/api/admin/category-attributes");
      if (res.data.success) setList(res.data.data);
    } finally {
      setLoading(false);
    }
   
  }, [token]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setAttrs([]);
    setEditing(null);
    setError("");
    setModal("add");
  }

  function openEdit(item: CategoryAttributes) {
    setForm({ category: item.category, label: item.label, isActive: item.isActive });
    setAttrs(item.attributes.map((a) => ({ ...a })));
    setEditing(item);
    setError("");
    setModal("edit");
  }

  function addAttr() {
    setAttrs((prev) => [...prev, { ...EMPTY_ATTR, order: prev.length }]);
  }

  function updateAttr(i: number, updated: AttributeDef) {
    setAttrs((prev) => prev.map((a, idx) => idx === i ? updated : a));
  }

  function removeAttr(i: number) {
    setAttrs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setError("");
    if (!form.category.trim() || !form.label.trim()) {
      setError("Category slug and label are required");
      return;
    }
    for (const a of attrs) {
      if (!a.key.trim() || !a.label.trim()) {
        setError("All attributes must have a key and label");
        return;
      }
    }

    setSaving(true);
    try {
      const body = { ...form, attributes: attrs };
      const url = editing ? `/api/admin/category-attributes/${editing._id}` : "/api/admin/category-attributes";
      const res = editing
        ? await authClient(token!).put<{ success: boolean; error?: string }>(url, body)
        : await authClient(token!).post<{ success: boolean; error?: string }>(url, body);
      if (!res.data.success) { setError(res.data.error ?? "Failed to save"); return; }
      setModal(null);
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category attribute schema? This will NOT affect existing products.")) return;
    setDeleting(id);
    try {
      await authClient(token!).delete(`/api/admin/category-attributes/${id}`);
      void load();
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(item: CategoryAttributes) {
    await authClient(token!).put(`/api/admin/category-attributes/${item._id}`, { isActive: !item.isActive });
    void load();
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Category Attributes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Define dynamic filterable attributes per category (e.g. RAM for Mobiles, Flavor for Oats)
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0A3352] transition-colors"
          data-testid="add-category-attr-btn"
        >
          <Plus className="h-4 w-4" /> Add Category Schema
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No category attribute schemas yet</p>
          <p className="text-sm mt-1">Add a schema to enable dynamic filters for a category</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="category-attr-list">
          {list.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4"
              data-testid={`cat-attr-row-${item.category}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.label}</span>
                    <code className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">
                      {item.category}
                    </code>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.isActive
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    }`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.attributes.map((a) => (
                      <span
                        key={a.key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                      >
                        {a.label}
                        <span className="text-blue-400/70">·{a.type}</span>
                        {a.filterable && <span className="text-green-500" title="Filterable">F</span>}
                      </span>
                    ))}
                    {item.attributes.length === 0 && (
                      <span className="text-xs text-gray-400 italic">No attributes defined</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => void toggleActive(item)}
                    className="p-1.5 text-gray-400 hover:text-[#0F4C75] transition-colors"
                    title={item.isActive ? "Deactivate" : "Activate"}
                    data-testid={`toggle-active-${item.category}`}
                  >
                    {item.isActive
                      ? <ToggleRight className="h-5 w-5 text-green-500" />
                      : <ToggleLeft  className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 text-gray-400 hover:text-[#0F4C75] transition-colors"
                    title="Edit"
                    data-testid={`edit-cat-attr-${item.category}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(item._id)}
                    disabled={deleting === item._id}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete"
                    data-testid={`delete-cat-attr-${item.category}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                {editing ? "Edit Category Schema" : "Add Category Schema"}
              </h2>
              <button onClick={() => setModal(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Category Slug <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                    placeholder="e.g. mobiles"
                    disabled={!!editing}
                    className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                    data-testid="cat-attr-category"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Display Label <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Mobiles"
                    className={inputCls}
                    data-testid="cat-attr-label"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="catIsActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded accent-[#0F4C75]"
                />
                <label htmlFor="catIsActive" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
              </div>

              {/* Attributes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Attributes</p>
                  <button
                    onClick={addAttr}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0F4C75] hover:underline"
                    data-testid="add-attr-btn"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Attribute
                  </button>
                </div>

                {attrs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    No attributes yet — click &quot;Add Attribute&quot; to define filterable fields
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {attrs.map((attr, i) => (
                      <AttrRow
                        key={i}
                        attr={attr}
                        index={i}
                        onChange={updateAttr}
                        onRemove={removeAttr}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3 justify-end border-t border-gray-100 dark:border-gray-800 pt-4">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0F4C75] rounded-lg hover:bg-[#0A3352] disabled:opacity-50 transition-colors"
                data-testid="save-cat-attr-btn"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Schema"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
