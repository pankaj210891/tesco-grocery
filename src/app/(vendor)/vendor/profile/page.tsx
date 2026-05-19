"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Store, Mail, User, MapPin, Phone, Globe, FileText,
  CheckCircle, AlertCircle, Loader2, Edit3, Lock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import type { Vendor } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg " +
  "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
  "focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] placeholder:text-gray-400 transition-shadow";

const labelCls =
  "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  pending:   { label: "Pending",   cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  suspended: { label: "Suspended", cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300" },
};

interface FormState {
  name:        string;
  description: string;
  logo:        string;
  phone:       string;
  address:     string;
  city:        string;
}

function formFromVendor(v: Vendor): FormState {
  return {
    name:        v.name        ?? "",
    description: v.description ?? "",
    logo:        v.logo        ?? "",
    phone:       v.phone       ?? "",
    address:     v.address     ?? "",
    city:        v.city        ?? "",
  };
}

// ── Read-only field ───────────────────────────────────────────────────────────

function ReadOnlyField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
        <Icon className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-600 dark:text-gray-400">{value || "—"}</span>
        <Lock className="h-3 w-3 text-gray-300 dark:text-gray-600 ml-auto shrink-0" />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VendorProfilePage() {
  const { user, token } = useAuthStore();
  const router          = useRouter();

  const [vendor,  setVendor]  = useState<Vendor | null>(null);
  const [form,    setForm]    = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");
  const [dirty,   setDirty]   = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authClient(token).get<ApiResponse<Vendor>>("/api/vendor/profile");
      const v   = res.data.data as Vendor;
      setVendor(v);
      setForm(formFromVendor(v));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user)                                           { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin") { router.push("/");     return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  function handleChange(key: keyof FormState, value: string) {
    setForm((f) => f ? { ...f, [key]: value } : f);
    setDirty(true);
    setSuccess(false);
  }

  async function handleSave() {
    if (!form || !token) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await authClient(token).put<ApiResponse<Vendor>>("/api/vendor/profile", form);
      const updated = res.data.data as Vendor;
      setVendor(updated);
      setForm(formFromVendor(updated));
      setDirty(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!vendor) return;
    setForm(formFromVendor(vendor));
    setDirty(false);
    setError("");
    setSuccess(false);
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!vendor || !form) {
    return (
      <div className="flex items-center gap-3 text-red-500 p-6">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{error || "Profile not found"}</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[vendor.status] ?? STATUS_CONFIG.pending;

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
            Business Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Update your storefront details visible to customers
          </p>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusConfig.cls}`}
          data-testid="vendor-status-badge"
        >
          {statusConfig.label}
        </span>
      </div>

      {/* ── Success / Error banners ── */}
      {success && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
          data-testid="success-banner"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Profile updated successfully</p>
        </div>
      )}
      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
          data-testid="error-banner"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Read-only identity block ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Account Information
          </h2>
          <span className="text-xs text-gray-400 ml-1">(managed by platform)</span>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField icon={Mail}  label="Email"      value={vendor.email} />
          <ReadOnlyField icon={User}  label="Owner"      value={vendor.ownerName} />
          <ReadOnlyField icon={Globe} label="Store Slug" value={`/store/${vendor.slug}`} />
        </div>
      </div>

      {/* ── Editable business details ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-[#1a7a4a]" />
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Business Details
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Business Name */}
          <div>
            <label className={labelCls} htmlFor="vendor-name">
              Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                id="vendor-name"
                type="text"
                value={form.name}
                data-testid="vendor-name-input"
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Your business name"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls} htmlFor="vendor-description">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              <textarea
                id="vendor-description"
                rows={4}
                value={form.description}
                data-testid="vendor-description-input"
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Tell customers about your business, products, and values…"
                className={`${inputCls} pl-9 resize-none`}
              />
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className={labelCls} htmlFor="vendor-logo">
              Logo URL
            </label>
            <input
              id="vendor-logo"
              type="url"
              value={form.logo}
              data-testid="vendor-logo-input"
              onChange={(e) => handleChange("logo", e.target.value)}
              placeholder="https://example.com/logo.png"
              className={inputCls}
            />
            {form.logo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={form.logo}
                alt="Logo preview"
                className="mt-2 h-14 w-14 rounded-lg object-contain border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                data-testid="logo-preview"
              />
            )}
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls} htmlFor="vendor-phone">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                id="vendor-phone"
                type="tel"
                value={form.phone}
                data-testid="vendor-phone-input"
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          {/* Address + City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="vendor-address">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="vendor-address"
                  type="text"
                  value={form.address}
                  data-testid="vendor-address-input"
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Street address"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="vendor-city">
                City
              </label>
              <input
                id="vendor-city"
                type="text"
                value={form.city}
                data-testid="vendor-city-input"
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Mumbai"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
          <p className="text-xs text-gray-400">
            {dirty ? "You have unsaved changes" : "All changes saved"}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDiscard}
              disabled={!dirty || saving}
              data-testid="discard-btn"
              className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving || !form.name.trim()}
              data-testid="save-profile-btn"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#1a7a4a] rounded-lg hover:bg-[#145e38] disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
