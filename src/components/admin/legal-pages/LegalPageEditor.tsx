"use client";

import { useState, useCallback } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2,
  FileText, Shield, X,
} from "lucide-react";
import { authClient } from "@/lib/axios";
import { toast } from "sonner";
import type { LegalPage, ContentBlockType } from "@/types";
import { cn } from "@/lib/utils/cn";

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Local editor types ───────────────────────────────────────────────────────

type EditorBlock = {
  _key: string;
  type: ContentBlockType;
  text: string;
  items: string[];
};

type EditorSection = {
  _key: string;
  id: string;
  title: string;
  open: boolean;
  blocks: EditorBlock[];
};

type FormState = {
  title: string;
  introText: string;
  version: string;
  lastUpdated: string;
  effectiveDate: string;
  isPublished: boolean;
  sections: EditorSection[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoToDateInput(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || uid()
  );
}

function initFromPage(page: LegalPage): FormState {
  return {
    title: page.title,
    introText: page.introText,
    version: page.version,
    lastUpdated: isoToDateInput(page.lastUpdated),
    effectiveDate: isoToDateInput(page.effectiveDate),
    isPublished: page.isPublished,
    sections: page.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        _key: uid(),
        id: s.id,
        title: s.title,
        open: false,
        blocks: s.blocks.map((b) => ({
          _key: uid(),
          type: b.type,
          text: b.text ?? "",
          items: b.items ?? [],
        })),
      })),
  };
}

// ─── Block type options ───────────────────────────────────────────────────────

const BLOCK_TYPES: { value: ContentBlockType; label: string }[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "subheading", label: "Subheading" },
  { value: "highlight", label: "Highlight" },
  { value: "bulletList", label: "Bullet List" },
  { value: "numberedList", label: "Numbered List" },
];

// ─── BlockEditor ─────────────────────────────────────────────────────────────

interface BlockEditorProps {
  block: EditorBlock;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updated: Partial<EditorBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BlockEditor({
  block,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: BlockEditorProps) {
  const isList = block.type === "bulletList" || block.type === "numberedList";

  function setItem(idx: number, val: string) {
    const items = [...block.items];
    items[idx] = val;
    onUpdate({ items });
  }

  function addItem() {
    onUpdate({ items: [...block.items, ""] });
  }

  function removeItem(idx: number) {
    onUpdate({ items: block.items.filter((_, i) => i !== idx) });
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2.5">
      {/* Block controls row */}
      <div className="flex items-center gap-2">
        <select
          value={block.type}
          onChange={(e) =>
            onUpdate({ type: e.target.value as ContentBlockType, text: "", items: [""] })
          }
          className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
        >
          {BLOCK_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            title="Remove block"
            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Block content */}
      {isList ? (
        <div className="space-y-1.5">
          {block.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-500 shrink-0 w-5 text-center">
                {block.type === "numberedList" ? `${idx + 1}.` : "•"}
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(idx, e.target.value)}
                placeholder={`Item ${idx + 1}`}
                className="flex-1 h-8 px-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
              />
              <button
                onClick={() => removeItem(idx)}
                disabled={block.items.length <= 1}
                className="p-1 rounded text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors mt-1 pl-6"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>
      ) : (
        <textarea
          value={block.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          rows={block.type === "subheading" ? 1 : 3}
          placeholder={
            block.type === "subheading"
              ? "Subheading text…"
              : block.type === "highlight"
              ? "Highlight / callout text…"
              : "Paragraph text…"
          }
          className={cn(
            "w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 resize-none leading-relaxed",
            block.type === "highlight"
              ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-900/10"
              : "border-gray-200 dark:border-gray-700"
          )}
        />
      )}
    </div>
  );
}

// ─── SectionEditor ────────────────────────────────────────────────────────────

interface SectionEditorProps {
  section: EditorSection;
  sectionNumber: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updated: Partial<EditorSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SectionEditor({
  section,
  sectionNumber,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SectionEditorProps) {
  function updateBlock(key: string, updated: Partial<EditorBlock>) {
    onUpdate({
      blocks: section.blocks.map((b) => (b._key === key ? { ...b, ...updated } : b)),
    });
  }

  function removeBlock(key: string) {
    onUpdate({ blocks: section.blocks.filter((b) => b._key !== key) });
  }

  function moveBlock(idx: number, dir: "up" | "down") {
    const blocks = [...section.blocks];
    const target = dir === "up" ? idx - 1 : idx + 1;
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    onUpdate({ blocks });
  }

  function addBlock() {
    onUpdate({
      blocks: [
        ...section.blocks,
        { _key: uid(), type: "paragraph", text: "", items: [""] },
      ],
    });
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Section number badge */}
        <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
          {sectionNumber}
        </span>

        {/* Title input */}
        <input
          value={section.title}
          onChange={(e) =>
            onUpdate({ title: e.target.value, id: slugify(e.target.value) || section.id })
          }
          placeholder="Section title…"
          className="flex-1 min-w-0 text-sm font-semibold bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 border-b border-transparent focus:border-amber-400 focus:outline-none pb-0.5 transition-colors"
        />

        {/* Meta + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
            {section.blocks.length} {section.blocks.length === 1 ? "block" : "blocks"}
          </span>
          <button
            onClick={() => onUpdate({ open: !section.open })}
            className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {section.open ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{section.open ? "Collapse" : "Expand"}</span>
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            title="Delete section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Section body */}
      {section.open && (
        <div className="px-5 py-4 space-y-3">
          {section.blocks.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
              No blocks yet.
            </p>
          )}
          {section.blocks.map((block, idx) => (
            <BlockEditor
              key={block._key}
              block={block}
              isFirst={idx === 0}
              isLast={idx === section.blocks.length - 1}
              onUpdate={(u) => updateBlock(block._key, u)}
              onRemove={() => removeBlock(block._key)}
              onMoveUp={() => moveBlock(idx, "up")}
              onMoveDown={() => moveBlock(idx, "down")}
            />
          ))}
          <button
            onClick={addBlock}
            className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors mt-1"
          >
            <Plus className="h-4 w-4" />
            Add block
          </button>
        </div>
      )}
    </div>
  );
}

// ─── LegalPageEditor ──────────────────────────────────────────────────────────

export interface LegalPageEditorProps {
  page: LegalPage;
  token: string;
  onSaved: () => void;
}

export function LegalPageEditor({ page, token, onSaved }: LegalPageEditorProps) {
  const [form, setForm] = useState<FormState>(() => initFromPage(page));
  const [saving, setSaving] = useState(false);

  function patch(p: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function updateSection(key: string, updated: Partial<EditorSection>) {
    patch({ sections: form.sections.map((s) => (s._key === key ? { ...s, ...updated } : s)) });
  }

  function removeSection(key: string) {
    patch({ sections: form.sections.filter((s) => s._key !== key) });
  }

  function moveSection(idx: number, dir: "up" | "down") {
    const sections = [...form.sections];
    const target = dir === "up" ? idx - 1 : idx + 1;
    [sections[idx], sections[target]] = [sections[target], sections[idx]];
    patch({ sections });
  }

  function addSection() {
    const key = uid();
    patch({
      sections: [
        ...form.sections,
        {
          _key: key,
          id: `section-${key}`,
          title: "",
          open: true,
          blocks: [{ _key: uid(), type: "paragraph", text: "", items: [""] }],
        },
      ],
    });
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const toISO = (d: string) =>
        d ? `${d}T00:00:00.000Z` : new Date().toISOString();

      const payload = {
        title: form.title,
        introText: form.introText,
        version: form.version,
        lastUpdated: toISO(form.lastUpdated),
        effectiveDate: toISO(form.effectiveDate),
        isPublished: form.isPublished,
        sections: form.sections.map((s, idx) => ({
          id: s.id,
          title: s.title,
          order: idx + 1,
          blocks: s.blocks.map((b) => {
            const isList = b.type === "bulletList" || b.type === "numberedList";
            return {
              type: b.type,
              ...(isList
                ? { items: b.items.filter((i) => i.trim()) }
                : { text: b.text }),
            };
          }),
        })),
      };

      const { data } = await authClient(token).put<{ success: boolean; error?: string }>(
        `/api/admin/legal-pages/${page._id}`,
        payload
      );

      if (data.success) {
        toast.success("Legal page saved successfully");
        onSaved();
      } else {
        toast.error(data.error ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save legal page");
    } finally {
      setSaving(false);
    }
  }, [form, page._id, token, onSaved]);

  const totalBlocks = form.sections.reduce((acc, s) => acc + s.blocks.length, 0);

  return (
    <div className="space-y-6">
      {/* Editor header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              page.slug === "terms"
                ? "bg-blue-50 dark:bg-blue-900/20"
                : "bg-green-50 dark:bg-green-900/20"
            )}
          >
            {page.slug === "terms" ? (
              <FileText className="h-5 w-5 text-blue-500" />
            ) : (
              <Shield className="h-5 w-5 text-green-500" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              Edit {page.slug === "terms" ? "Terms & Conditions" : "Privacy Policy"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {form.sections.length} sections · {totalBlocks} blocks · v{form.version}
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20 disabled:opacity-60 shrink-0"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Metadata card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Page Metadata
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Title */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Page title"
              className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
            />
          </div>

          {/* Version */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Version
            </label>
            <input
              value={form.version}
              onChange={(e) => patch({ version: e.target.value })}
              placeholder="e.g. 2.1"
              className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
            />
          </div>

          {/* Last Updated */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Last Updated
            </label>
            <input
              type="date"
              value={form.lastUpdated}
              onChange={(e) => patch({ lastUpdated: e.target.value })}
              className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
            />
          </div>

          {/* Effective Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Effective Date
            </label>
            <input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => patch({ effectiveDate: e.target.value })}
              className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
            />
          </div>

          {/* Published toggle */}
          <div className="flex items-end pb-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isPublished}
                onClick={() => patch({ isPublished: !form.isPublished })}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2",
                  form.isPublished
                    ? "bg-amber-500"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                    form.isPublished ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {form.isPublished ? "Published" : "Draft"}
              </span>
            </div>
          </div>
        </div>

        {/* Intro text */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
            Introduction Text
          </label>
          <textarea
            value={form.introText}
            onChange={(e) => patch({ introText: e.target.value })}
            rows={4}
            placeholder="Introduction shown at the top of the page…"
            className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Sections panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Sections ({form.sections.length})
          </h2>
          <button
            onClick={addSection}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Section
          </button>
        </div>

        {form.sections.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No sections yet. Click <strong>Add Section</strong> to get started.
            </p>
          </div>
        )}

        {form.sections.map((section, idx) => (
          <SectionEditor
            key={section._key}
            section={section}
            sectionNumber={idx + 1}
            isFirst={idx === 0}
            isLast={idx === form.sections.length - 1}
            onUpdate={(u) => updateSection(section._key, u)}
            onRemove={() => removeSection(section._key)}
            onMoveUp={() => moveSection(idx, "up")}
            onMoveDown={() => moveSection(idx, "down")}
          />
        ))}

        {form.sections.length > 0 && (
          <button
            onClick={addSection}
            className="flex items-center gap-2 px-4 py-3 w-full justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add another section
          </button>
        )}
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-4 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {form.sections.length} sections · {totalBlocks} blocks
        </p>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
