"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Store, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface InviteData {
  email:        string;
  businessName: string;
  contactName:  string;
}

type Step = "loading" | "invalid" | "form" | "success";

interface FormState {
  name:         string;
  businessName: string;
  slug:         string;
  description:  string;
  phone:        string;
  address:      string;
  city:         string;
  password:     string;
  confirmPassword: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const inputCls =
  "w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#14532d] placeholder:text-gray-400";

const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1";

// ─── Step indicators ─────────────────────────────────────────────────────────

const STEPS = ["Account Details", "Business Info", "Review & Submit"] as const;

function StepDot({ idx, current }: { idx: number; current: number }) {
  const done    = idx < current;
  const active  = idx === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          done   ? "bg-[#14532d] text-white" :
          active ? "bg-[#14532d] text-white ring-4 ring-green-100 dark:ring-green-900/30" :
                   "bg-gray-100 dark:bg-gray-800 text-gray-400"
        }`}
      >
        {done ? <CheckCircle className="h-4 w-4" /> : idx + 1}
      </div>
      <span className={`text-[10px] font-semibold hidden sm:block ${active ? "text-[#14532d]" : "text-gray-400"}`}>
        {STEPS[idx]}
      </span>
    </div>
  );
}

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center gap-3 mb-8">
      {STEPS.map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <StepDot idx={i} current={current} />
          {i < STEPS.length - 1 && (
            <div className={`w-12 h-0.5 mt-[-16px] sm:mt-[-22px] rounded-full transition-colors ${i < current ? "bg-[#14532d]" : "bg-gray-200 dark:bg-gray-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VendorOnboardingForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { setAuth }  = useAuthStore();

  const token = searchParams.get("token") ?? "";

  const [step,       setStep]       = useState<Step>("loading");
  const [formStep,   setFormStep]   = useState(0);   // 0, 1, 2
  const [invite,     setInvite]     = useState<InviteData | null>(null);
  const [invalidMsg, setInvalidMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [showPw,    setShowPw]    = useState(false);
  const [showCfPw,  setShowCfPw]  = useState(false);

  const [form, setForm] = useState<FormState>({
    name:            "",
    businessName:    "",
    slug:            "",
    description:     "",
    phone:           "",
    address:         "",
    city:            "",
    password:        "",
    confirmPassword: "",
  });

  // ── Token verification ───────────────────────────────────────────────────

  const verifyToken = useCallback(async () => {
    if (!token) { setStep("invalid"); setInvalidMsg("No invite token found in the link."); return; }

    const res  = await fetch(`/api/vendor/onboarding/verify?token=${encodeURIComponent(token)}`);
    const json = await res.json() as { success: boolean; data?: InviteData; error?: string };

    if (!json.success || !json.data) {
      setInvalidMsg(json.error ?? "Invalid invite link.");
      setStep("invalid");
      return;
    }

    setInvite(json.data);
    setForm((f) => ({
      ...f,
      name:         json.data!.contactName,
      businessName: json.data!.businessName,
      slug:         toSlug(json.data!.businessName),
    }));
    setStep("form");
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void verifyToken();
  }, [verifyToken]);

  // ── Field helpers ────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, val: string) {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === "businessName") next.slug = toSlug(val);
      return next;
    });
  }

  // ── Validation per step ─────────────────────────────────────────────────

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!form.name.trim())     return "Full name is required.";
      if (!form.password)        return "Password is required.";
      if (form.password.length < 8)              return "Password must be at least 8 characters.";
      if (!/[A-Z]/.test(form.password))          return "Password must contain an uppercase letter.";
      if (!/[0-9]/.test(form.password))          return "Password must contain a number.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    if (s === 1) {
      if (!form.businessName.trim()) return "Business name is required.";
      if (!form.slug.trim())         return "Store slug is required.";
      if (!/^[a-z0-9-]+$/.test(form.slug)) return "Slug may only contain lowercase letters, numbers, and hyphens.";
    }
    return null;
  }

  function handleNext() {
    const err = validateStep(formStep);
    if (err) { setSubmitError(err); return; }
    setSubmitError("");
    setFormStep((s) => s + 1);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const err = validateStep(2);
    if (err) { setSubmitError(err); return; }
    setSubmitting(true);
    setSubmitError("");

    const res  = await fetch("/api/vendor/onboarding/complete", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, ...form }),
    });
    const json = await res.json() as {
      success: boolean;
      error?: string;
      data?: { user: User; token: string };
    };

    setSubmitting(false);

    if (!json.success || !json.data) {
      setSubmitError(json.error ?? "Onboarding failed. Please try again.");
      return;
    }

    setAuth(json.data.user, json.data.token);
    setStep("success");
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (step === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#14532d]" />
        <p className="text-sm">Verifying your invite link…</p>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="w-full max-w-md text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Invite Link Invalid</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{invalidMsg}</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#14532d] hover:bg-[#0f3d20] rounded-lg transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="w-full max-w-md text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-[#14532d]" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Account Created!</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Welcome, <strong>{form.name}</strong>. Your seller account for{" "}
          <strong>{form.businessName}</strong> has been created.
        </p>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300 text-left">
          <p className="font-semibold mb-1">Awaiting Admin Approval</p>
          <p>Your store is under review. You&apos;ll receive an email once it&apos;s approved and you can start listing products.</p>
        </div>
        <button
          onClick={() => router.push("/vendor")}
          className="w-full py-3 text-sm font-semibold text-white bg-[#14532d] hover:bg-[#0f3d20] rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Go to Seller Dashboard <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#14532d" }}>
            <Store className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black text-gray-900 dark:text-gray-100">Seller Onboarding</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Setting up store for <strong className="text-[#14532d]">{invite?.businessName}</strong>
        </p>
        <p className="text-xs text-gray-400 mt-1">{invite?.email}</p>
      </div>

      <StepBar current={formStep} />

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">

        {submitError && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {submitError}
          </div>
        )}

        {/* ── Step 0: Account Details ── */}
        {formStep === 0 && (
          <>
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
                className={inputCls}
                data-testid="onboarding-name"
              />
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input value={invite?.email ?? ""} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
              <p className="mt-1 text-xs text-gray-400">Locked to your invite email</p>
            </div>

            <div>
              <label className={labelCls}>Password *</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className={`${inputCls} pr-10`}
                  data-testid="onboarding-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Confirm Password *</label>
              <div className="relative">
                <input
                  type={showCfPw ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Re-enter your password"
                  className={`${inputCls} pr-10`}
                  data-testid="onboarding-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCfPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showCfPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 1: Business Info ── */}
        {formStep === 1 && (
          <>
            <div>
              <label className={labelCls}>Business Name *</label>
              <input
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
                placeholder="Your store name"
                className={inputCls}
                data-testid="onboarding-business-name"
              />
            </div>

            <div>
              <label className={labelCls}>Store Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 shrink-0">store/</span>
                <input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="your-store-name"
                  className={inputCls}
                  data-testid="onboarding-slug"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Unique URL for your store. Cannot be changed later.</p>
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Tell customers about your business…"
                rows={3}
                className={`${inputCls} resize-none`}
                data-testid="onboarding-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                  data-testid="onboarding-phone"
                />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Mumbai"
                  className={inputCls}
                  data-testid="onboarding-city"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Business Address</label>
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street address, building, area"
                className={inputCls}
                data-testid="onboarding-address"
              />
            </div>
          </>
        )}

        {/* ── Step 2: Review ── */}
        {formStep === 2 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Review your details</h3>
            {[
              { label: "Full Name",      value: form.name },
              { label: "Email",          value: invite?.email ?? "" },
              { label: "Business Name",  value: form.businessName },
              { label: "Store Slug",     value: `store/${form.slug}` },
              { label: "Description",    value: form.description || "—" },
              { label: "Phone",          value: form.phone || "—" },
              { label: "City",           value: form.city || "—" },
              { label: "Address",        value: form.address || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <dt className="w-32 shrink-0 text-xs font-semibold text-gray-400 uppercase">{label}</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 break-all">{value}</dd>
              </div>
            ))}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
              Your store will be <strong>pending admin approval</strong> after submission. You&apos;ll be notified by email once approved.
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="flex gap-3 pt-2">
          {formStep > 0 && (
            <button
              onClick={() => { setSubmitError(""); setFormStep((s) => s - 1); }}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
          )}

          {formStep < 2 ? (
            <button
              onClick={handleNext}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#14532d] hover:bg-[#0f3d20] rounded-lg transition-colors flex items-center justify-center gap-2"
              data-testid="onboarding-next"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#14532d] hover:bg-[#0f3d20] disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              data-testid="onboarding-submit"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating Account…</>
              ) : (
                <>Create My Seller Account <CheckCircle className="h-4 w-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
