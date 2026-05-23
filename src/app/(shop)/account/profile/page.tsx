"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Check, X, AlertTriangle, CheckCircle, Phone, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { useAccountProfile } from "@/hooks/useAccountProfile";
import AddressSection from "@/components/account/AddressSection";
import PhoneVerificationModal from "@/components/account/PhoneVerificationModal";

// ── Inline edit field ──────────────────────────────────────────────────────────
interface EditFieldProps {
  label:       string;
  value:       string;
  placeholder: string;
  onSave:      (val: string) => Promise<void>;
  validate?:   (val: string) => string | null;
  type?:       string;
}

function EditField({ label, value, placeholder, onSave, validate, type = "text" }: EditFieldProps) {
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState(value);
  const [saving,   setSaving]   = useState(false);
  const [fieldErr, setFieldErr] = useState<string | null>(null);

  function startEdit() { setDraft(value); setFieldErr(null); setEditing(true); }
  function cancel()    { setEditing(false); setFieldErr(null); }

  async function handleSave() {
    const err = validate?.(draft) ?? null;
    if (err) { setFieldErr(err); return; }
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (e) {
      setFieldErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        {editing ? (
          <div className="space-y-2">
            <input
              type={type}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setFieldErr(null); }}
              placeholder={placeholder}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); if (e.key === "Escape") cancel(); }}
              className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/40 focus:border-[#0F4C75]"
              autoFocus
            />
            {fieldErr && <p className="text-xs text-red-600 dark:text-red-400">{fieldErr}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0F4C75] text-white text-xs font-semibold rounded-lg hover:bg-[#0d3f63] disabled:opacity-50 transition-colors"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={cancel}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800 dark:text-white">{value || <span className="text-gray-400 italic">{placeholder}</span>}</p>
        )}
      </div>
      {!editing && (
        <button
          onClick={startEdit}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PersonalDetailsPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user, token, setAuth } = useAuthStore();
  const { profile, loading, refresh } = useAccountProfile();
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login?redirect=/account/profile");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((n) => <div key={n} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  async function updateProfile(updates: { name?: string; phone?: string | null }) {
    if (!token) return;
    const client = authClient(token);
    await client.put("/api/account/profile", updates);
    // Update the auth store name if name changed
    if (updates.name && updates.name !== user!.name) {
      setAuth({ ...user!, name: updates.name }, token);
    }
    refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-[#0F4C75] dark:hover:text-blue-400 transition-colors">My account</Link>
        <span aria-hidden>/</span>
        <span className="text-gray-800 dark:text-white font-medium">Personal details</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/account"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back to account"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden />
        </Link>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Personal details</h1>
      </div>

      <div className="space-y-5">
        {/* Name section */}
        <section className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 px-5 py-2">
          <div className="flex items-center gap-2 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <User className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Name</h2>
          </div>
          <EditField
            label="Full name"
            value={user.name}
            placeholder="Enter your full name"
            validate={(v) => v.trim().length < 2 ? "Name must be at least 2 characters" : null}
            onSave={async (val) => {
              await updateProfile({ name: val });
              toast.success("Name updated.");
            }}
          />
        </section>

        {/* Phone section */}
        <section className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 px-5 py-2">
          <div className="flex items-center gap-2 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <Phone className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Phone number</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 py-2">
            Adding and verifying a mobile number means you can get order updates and messages to keep your account secure.
          </p>
          {loading ? (
            <div className="animate-pulse h-10 bg-gray-100 dark:bg-gray-700/40 rounded-lg my-2" />
          ) : (
            <>
              {/* Verified badge */}
              {profile?.phone && profile.isPhoneVerified && (
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" aria-hidden />
                  <p className="text-xs text-green-700 dark:text-green-400 font-semibold">
                    Phone number verified
                  </p>
                </div>
              )}

              {/* Unverified warning */}
              {profile?.phone && !profile.isPhoneVerified && (
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Phone number not verified.{" "}
                    <button
                      onClick={() => setShowVerifyModal(true)}
                      className="font-semibold underline hover:no-underline"
                    >
                      Verify now
                    </button>
                  </p>
                </div>
              )}

              <EditField
                label="Mobile number"
                value={profile?.phone ?? ""}
                placeholder="Add a mobile number"
                type="tel"
                validate={(v) =>
                  v && !/^\+?[\d\s\-()\\.]{7,20}$/.test(v)
                    ? "Please enter a valid phone number"
                    : null
                }
                onSave={async (val) => {
                  await updateProfile({ phone: val || null });
                  toast.success(val ? "Phone number saved. Verify it to keep your account secure." : "Phone number removed.");
                  if (val) setTimeout(() => setShowVerifyModal(true), 600);
                }}
              />
            </>
          )}
        </section>

        {/* Email section */}
        <section className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 px-5 py-2">
          <div className="flex items-center gap-2 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Email</h2>
          </div>
          <div className="py-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email address</p>
            <p className="text-sm text-gray-800 dark:text-white">{user.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Contact support to change your email address.</p>
          </div>
        </section>

        {/* Addresses section */}
        <section className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Delivery addresses</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Where you&rsquo;ll get orders delivered to.</p>
          </div>
          <div className="p-5">
            <AddressSection />
          </div>
        </section>
      </div>

      {/* Phone verification modal */}
      {showVerifyModal && profile?.phone && (
        <PhoneVerificationModal
          phone={profile.phone}
          onClose={() => setShowVerifyModal(false)}
          onVerified={() => {
            toast.success("Phone number verified successfully!");
            refresh();
          }}
        />
      )}
    </div>
  );
}
