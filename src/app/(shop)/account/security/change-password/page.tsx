"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";

// ── Password input with show/hide toggle ───────────────────────────────────────
function PasswordInput({
  id, label, value, onChange, error, placeholder,
}: {
  id:          string;
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  error?:      string | null;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-12 text-sm border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/40 transition-colors ${
            error
              ? "border-red-400 dark:border-red-500 focus:border-red-400"
              : "border-gray-300 dark:border-gray-600 focus:border-[#0F4C75]"
          }`}
          autoComplete={id === "currentPassword" ? "current-password" : "new-password"}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0F4C75] dark:text-blue-400 text-sm font-semibold hover:underline"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ChangePasswordPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user, token, logout } = useAuthStore();

  const [current,   setCurrent]   = useState("");
  const [next,      setNext]      = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [signOut,   setSignOut]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  useEffect(() => {
    if (hydrated && !user) router.replace("/login?redirect=/account/security/change-password");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((n) => <div key={n} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!current) errs.current = "Current password is required";
    if (!next)    errs.next    = "New password is required";
    else if (next.length < 8) errs.next = "Password must be at least 8 characters";
    if (!confirm)              errs.confirm = "Please confirm your new password";
    else if (next !== confirm) errs.confirm = "Passwords do not match";
    if (current && next && current === next) errs.next = "New password must differ from current password";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !token) return;

    setSaving(true);
    try {
      const client = authClient(token);
      await client.put("/api/account/security/change-password", {
        currentPassword: current,
        newPassword:     next,
      });
      toast.success("Password changed successfully.");
      if (signOut) {
        logout();
        router.push("/login");
      } else {
        router.push("/account");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      if (msg.toLowerCase().includes("current")) {
        setErrors({ current: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-[#0F4C75] dark:hover:text-blue-400 transition-colors">My account</Link>
        <span aria-hidden>/</span>
        <span className="text-gray-800 dark:text-white font-medium">Change password</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/account"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back to account"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden />
        </Link>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Change password</h1>
      </div>

      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6">
        {/* Icon + intro */}
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100 dark:border-gray-700/60">
          <div className="w-10 h-10 rounded-xl bg-[#0F4C75]/10 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5 text-[#0F4C75] dark:text-blue-400" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Enter a new password below.</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">You can&rsquo;t use a password you&rsquo;ve previously used.</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
          <PasswordInput
            id="currentPassword"
            label="Current password"
            value={current}
            onChange={(v) => { setCurrent(v); setErrors((e) => ({ ...e, current: "" })); }}
            error={errors.current}
          />
          <PasswordInput
            id="newPassword"
            label="Enter new password"
            value={next}
            onChange={(v) => { setNext(v); setErrors((e) => ({ ...e, next: "" })); }}
            error={errors.next}
          />
          <PasswordInput
            id="confirmPassword"
            label="Confirm new password"
            value={confirm}
            onChange={(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: "" })); }}
            error={errors.confirm}
          />

          {/* Sign out all devices */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={signOut}
              onChange={(e) => setSignOut(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0F4C75] focus:ring-[#0F4C75]/40 cursor-pointer"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Sign me out of all devices and third parties my account is connected to
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-[#0F4C75] hover:bg-[#0d3f63] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/40"
          >
            {saving ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>

      {/* Footer links */}
      <div className="mt-6 text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-[#0F4C75] dark:text-blue-400 hover:underline"
        >
          Forgot your current password?
        </Link>
      </div>
    </div>
  );
}
