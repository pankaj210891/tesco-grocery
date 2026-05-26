"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiClient } from "@/lib/axios";
import type { PlaceDetailsResult } from "@/app/api/places/details/route";

// ── Public types ──────────────────────────────────────────────────────────────

export type AddressFields = {
  line1:    string;
  line2:    string;
  city:     string;
  postcode: string;
  country:  string;
};

export interface AddressAutocompleteProps {
  value:       string;
  error?:      { message?: string };
  placeholder?: string;
  onChange:    (value: string) => void;
  /** Called once suggestions have been selected AND Place Details resolved.
   *  Receives fully structured address fields — no further API calls needed. */
  onSelect:    (fields: AddressFields) => void;
}

// ── Internal types ────────────────────────────────────────────────────────────

type Suggestion = {
  placeId:       string;
  description:   string;
  mainText:      string;
  secondaryText: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (hasError?: boolean) =>
  cn(
    "w-full px-3.5 py-2.5 text-base md:text-sm border rounded-xl outline-none transition-colors",
    "bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500",
    "text-gray-900 dark:text-white",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-gray-300 dark:border-gray-600 focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15",
  );

/** Extract the local area string from a Places description, using the resolved
 *  city as a right-side delimiter so landmarks ("opp.", "near", etc.) are kept.
 *
 *  "Amrapali Resicom, Sun Pharma Road, opp. Shyamal Park Road, Pratham Upvan, Vadodara, Gujarat, India"
 *  → mainText = "Amrapali Resicom", city = "Vadodara"
 *  → "Sun Pharma Road, opp. Shyamal Park Road, Pratham Upvan"
 */
function extractLine2(suggestion: Suggestion, city: string): string {
  const afterBuilding = suggestion.description.startsWith(suggestion.mainText)
    ? suggestion.description.slice(suggestion.mainText.length).replace(/^,\s*/, "")
    : suggestion.secondaryText;

  const cityIdx = afterBuilding.indexOf(city);
  return (cityIdx > 0 ? afterBuilding.slice(0, cityIdx) : afterBuilding)
    .replace(/,\s*$/, "")
    .trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddressAutocomplete({
  value,
  error,
  placeholder = "Start typing your address…",
  onChange,
  onSelect,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open,        setOpen]        = useState(false);
  const [resolving,   setResolving]   = useState(false);
  const [dropPos,     setDropPos]     = useState({ top: 0, left: 0, width: 0 });

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Position helpers ────────────────────────────────────────────────────────

  const calcPos = useCallback(() => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  // Close on outside click (input container OR portal dropdown)
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const portal = document.getElementById("addr-ac-dropdown");
      if (
        containerRef.current?.contains(e.target as Node) ||
        portal?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Realign dropdown on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", calcPos, true);
    window.addEventListener("resize", calcPos);
    return () => {
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
    };
  }, [open, calcPos]);

  // ── Autocomplete fetch (debounced) ──────────────────────────────────────────

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!v || v.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: Suggestion[] }>(`/api/places/autocomplete?input=${encodeURIComponent(v)}`);
        if (res.data.success && res.data.data.length > 0) {
          setSuggestions(res.data.data);
          calcPos();
          setOpen(true);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }

  // ── Selection: resolve full address via Place Details ───────────────────────

  async function handleSelect(s: Suggestion) {
    setOpen(false);
    setSuggestions([]);

    // Set line1 immediately so the field responds at once
    onChange(s.mainText);
    setResolving(true);

    try {
      const res = await apiClient.get<{ success: boolean; data?: PlaceDetailsResult }>(`/api/places/details?placeId=${encodeURIComponent(s.placeId)}`);

      if (!res.data.success || !res.data.data) {
        onSelect({ line1: s.mainText, line2: s.secondaryText, city: "", postcode: "", country: "" });
        return;
      }

      const { city, postcode, country } = res.data.data;
      const line2 = city ? extractLine2(s, city) : s.secondaryText;

      onSelect({ line1: s.mainText, line2, city, postcode, country });
    } catch {
      // Graceful fallback — caller still gets line1
      onSelect({ line1: s.mainText, line2: s.secondaryText, city: "", postcode: "", country: "" });
    } finally {
      setResolving(false);
    }
  }

  // ── Dropdown portal ─────────────────────────────────────────────────────────

  const dropdown =
    open && suggestions.length > 0 && typeof document !== "undefined"
      ? createPortal(
          <ul
            id="addr-ac-dropdown"
            style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 99999 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto"
          >
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(s)}
                  className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                >
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[#FCA311]" />
                  <span>
                    <span className="font-medium text-gray-900 dark:text-white">{s.mainText}</span>
                    {s.secondaryText && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {s.secondaryText}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        disabled={resolving}
        className={cn(inputCls(!!error), resolving && "opacity-60 cursor-wait")}
      />
      {resolving && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="w-4 h-4 border-2 border-gray-300 border-t-[#FCA311] rounded-full animate-spin block" />
        </span>
      )}
      {dropdown}
    </div>
  );
}
