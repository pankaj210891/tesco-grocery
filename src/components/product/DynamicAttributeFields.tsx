"use client";

import { useEffect, useState } from "react";
import type { AttributeDef, CategoryAttributes } from "@/types";
import NumberInput from "@/components/ui/NumberInput";

interface DynamicAttributeFieldsProps {
  category: string;
  values: Record<string, string>;
  onChange: (attrs: Record<string, string>) => void;
  accentColor?: string;
}

// Fetches attribute schema for the selected category and renders the fields dynamically.
// Re-fetches whenever the category changes. Clears attribute values on category change.

export default function DynamicAttributeFields({
  category,
  values,
  onChange,
  accentColor = "#0F4C75",
}: DynamicAttributeFieldsProps) {
  const [schema, setSchema]     = useState<AttributeDef[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSchema([]);
      return;
    }
    setLoading(true);
    fetch(`/api/category-attributes?category=${encodeURIComponent(category.toLowerCase())}`)
      .then((r) => r.json() as Promise<{ success: boolean; data: CategoryAttributes | null }>)
      .then((json) => {
        if (json.success && json.data) {
          const sorted = [...json.data.attributes].sort((a, b) => a.order - b.order);
          setSchema(sorted);
        } else {
          setSchema([]);
        }
      })
      .catch(() => setSchema([]))
      .finally(() => setLoading(false));
  }, [category]);

  if (!category || schema.length === 0) {
    if (loading) {
      return (
        <div className="animate-pulse space-y-2 mt-1">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      );
    }
    return null;
  }

  const focusRing = `focus:ring-2 focus:outline-none`;
  const baseCls = `w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${focusRing}`;

  function set(key: string, val: string) {
    onChange({ ...values, [key]: val });
  }

  function toggleMulti(key: string, val: string) {
    const current = (values[key] ?? "").split(",").map((v) => v.trim()).filter(Boolean);
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onChange({ ...values, [key]: next.join(", ") });
  }

  return (
    <div className="space-y-4 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 mt-2">
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
        Category Attributes
      </p>
      {schema.map((attr) => {
        const val = values[attr.key] ?? "";

        if (attr.type === "boolean") {
          return (
            <div key={attr.key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`attr-${attr.key}`}
                checked={val === "true"}
                onChange={(e) => set(attr.key, e.target.checked ? "true" : "false")}
                className="h-4 w-4 rounded"
                style={{ accentColor }}
                data-testid={`attr-field-${attr.key}`}
              />
              <label htmlFor={`attr-${attr.key}`} className="text-sm text-gray-700 dark:text-gray-300">
                {attr.label}
                {attr.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
            </div>
          );
        }

        if (attr.type === "select" && attr.options.length > 0) {
          return (
            <div key={attr.key}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {attr.label}
                {attr.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <select
                value={val}
                onChange={(e) => set(attr.key, e.target.value)}
                className={baseCls}
                style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
                data-testid={`attr-field-${attr.key}`}
              >
                <option value="">Select {attr.label}…</option>
                {attr.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          );
        }

        if (attr.type === "multiselect" && attr.options.length > 0) {
          const selectedVals = val.split(",").map((v) => v.trim()).filter(Boolean);
          return (
            <div key={attr.key}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {attr.label}
                {attr.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <div className="flex flex-wrap gap-2" data-testid={`attr-field-${attr.key}`}>
                {attr.options.map((opt) => {
                  const checked = selectedVals.includes(opt);
                  return (
                    <label
                      key={opt}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${
                        checked
                          ? "border-current text-white"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                      style={checked ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMulti(attr.key, opt)}
                        className="sr-only"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }

        if (attr.type === "number") {
          return (
            <div key={attr.key}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {attr.label}
                {attr.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <NumberInput
                value={val}
                onChange={(e) => set(attr.key, e.target.value)}
                placeholder={attr.label}
                className={baseCls}
                data-testid={`attr-field-${attr.key}`}
              />
            </div>
          );
        }

        // text (default) or select without predefined options
        return (
          <div key={attr.key}>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              {attr.label}
              {attr.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
              type="text"
              value={val}
              onChange={(e) => set(attr.key, e.target.value)}
              placeholder={attr.label}
              className={baseCls}
              data-testid={`attr-field-${attr.key}`}
            />
          </div>
        );
      })}
    </div>
  );
}
