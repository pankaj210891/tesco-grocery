"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, ShieldAlert, Clock, AlertCircle,
  CheckCircle, Loader2, FileText,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import type { VendorKyc, KycStatus } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg " +
  "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
  "focus:outline-none focus:ring-2 focus:ring-[#1a7a4a] placeholder:text-gray-400 transition-shadow";

const labelCls =
  "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1";

const KYC_STATUS_CONFIG: Record<KycStatus, { label: string; cls: string; icon: React.ElementType; desc: string }> = {
  not_submitted: {
    label: "Not Submitted",
    cls:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon:  FileText,
    desc:  "Submit your KYC documents to unlock full platform features.",
  },
  pending: {
    label: "Under Review",
    cls:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon:  Clock,
    desc:  "Your documents are being reviewed by the platform team. This typically takes 1–2 business days.",
  },
  verified: {
    label: "Verified",
    cls:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon:  ShieldCheck,
    desc:  "Your KYC is verified. You have full access to all vendor features.",
  },
  rejected: {
    label: "Rejected",
    cls:   "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    icon:  ShieldAlert,
    desc:  "Your KYC was rejected. Please review the reason below and resubmit.",
  },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VendorKycPage() {
  const { user, token } = useAuthStore();
  const router          = useRouter();

  const [kyc,     setKyc]     = useState<VendorKyc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const [pan,     setPan]     = useState("");
  const [gst,     setGst]     = useState("");
  const [aadhaar, setAadhaar] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authClient(token).get<ApiResponse<VendorKyc | null>>("/api/vendor/kyc");
      const data = res.data.data ?? null;
      setKyc(data);
      if (data?.panNumber) setPan(data.panNumber);
      if (data?.gstNumber) setGst(data.gstNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KYC status");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await authClient(token).post<ApiResponse<VendorKyc>>("/api/vendor/kyc", {
        panNumber:     pan.toUpperCase().trim(),
        gstNumber:     gst.toUpperCase().trim(),
        aadhaarNumber: aadhaar.trim(),
      });
      setKyc(res.data.data as VendorKyc);
      setAadhaar("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit KYC");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    );
  }

  const status        = kyc?.status ?? "not_submitted";
  const statusConfig  = KYC_STATUS_CONFIG[status];
  const StatusIcon    = statusConfig.icon;
  const showForm      = status === "not_submitted" || status === "rejected";

  return (
    <div className="max-w-2xl space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">KYC Verification</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Submit identity documents to unlock full platform features
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${statusConfig.cls}`}
          data-testid="kyc-status-badge"
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {statusConfig.label}
        </span>
      </div>

      {/* Status info card */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-white dark:bg-gray-900"
        data-testid="kyc-status-card"
      >
        <StatusIcon className="h-5 w-5 shrink-0 mt-0.5 text-gray-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">{statusConfig.desc}</p>
      </div>

      {/* Rejection reason */}
      {status === "rejected" && kyc?.rejectionReason && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          data-testid="kyc-rejection-reason"
        >
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-0.5">Rejection Reason</p>
            <p className="text-sm text-red-700 dark:text-red-300">{kyc.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Verified: show submitted info */}
      {status === "verified" && kyc && (
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          data-testid="kyc-verified-card"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Verified Documents</h2>
          </div>
          <dl className="p-6 space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-xs font-semibold text-gray-400 uppercase">PAN</dt>
              <dd className="text-gray-900 dark:text-gray-100 font-mono">{kyc.panNumber}</dd>
            </div>
            {kyc.gstNumber && (
              <div className="flex gap-4">
                <dt className="w-32 shrink-0 text-xs font-semibold text-gray-400 uppercase">GST</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-mono">{kyc.gstNumber}</dd>
              </div>
            )}
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-xs font-semibold text-gray-400 uppercase">Aadhaar</dt>
              <dd className="text-gray-900 dark:text-gray-100 font-mono">
                XXXX XXXX {kyc.aadhaarLast4}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Pending: show submitted info (masked) */}
      {status === "pending" && kyc && (
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          data-testid="kyc-pending-card"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Submitted Documents</h2>
          </div>
          <dl className="p-6 space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-xs font-semibold text-gray-400 uppercase">PAN</dt>
              <dd className="text-gray-900 dark:text-gray-100 font-mono">{kyc.panNumber}</dd>
            </div>
            {kyc.gstNumber && (
              <div className="flex gap-4">
                <dt className="w-32 shrink-0 text-xs font-semibold text-gray-400 uppercase">GST</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-mono">{kyc.gstNumber}</dd>
              </div>
            )}
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-xs font-semibold text-gray-400 uppercase">Aadhaar</dt>
              <dd className="text-gray-900 dark:text-gray-100 font-mono">
                XXXX XXXX {kyc.aadhaarLast4}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
          data-testid="kyc-success-banner"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">KYC documents submitted successfully. Your review is underway.</p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
          data-testid="kyc-error-banner"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Submission form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          data-testid="kyc-form"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {status === "rejected" ? "Resubmit KYC Documents" : "Submit KYC Documents"}
            </h2>
          </div>

          <div className="p-6 space-y-5">
            {/* PAN */}
            <div>
              <label className={labelCls} htmlFor="kyc-pan">
                PAN Number <span className="text-red-500">*</span>
              </label>
              <input
                id="kyc-pan"
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                required
                data-testid="kyc-pan-input"
                className={`${inputCls} font-mono uppercase`}
              />
              <p className="mt-1 text-xs text-gray-400">10-character Permanent Account Number</p>
            </div>

            {/* GST */}
            <div>
              <label className={labelCls} htmlFor="kyc-gst">
                GST Number <span className="text-gray-400 text-[10px] normal-case font-normal">(optional)</span>
              </label>
              <input
                id="kyc-gst"
                type="text"
                value={gst}
                onChange={(e) => setGst(e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                maxLength={15}
                data-testid="kyc-gst-input"
                className={`${inputCls} font-mono uppercase`}
              />
              <p className="mt-1 text-xs text-gray-400">15-character GSTIN if registered</p>
            </div>

            {/* Aadhaar */}
            <div>
              <label className={labelCls} htmlFor="kyc-aadhaar">
                Aadhaar Number <span className="text-red-500">*</span>
              </label>
              <input
                id="kyc-aadhaar"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 12-digit Aadhaar number"
                maxLength={12}
                required
                data-testid="kyc-aadhaar-input"
                className={`${inputCls} font-mono tracking-widest`}
              />
              <p className="mt-1 text-xs text-gray-400">
                Your Aadhaar number is masked and only the last 4 digits are stored.
              </p>
            </div>
          </div>

          <div className="px-6 pb-6 flex justify-end">
            <button
              type="submit"
              disabled={saving || !pan.trim() || !aadhaar.trim()}
              data-testid="kyc-submit-btn"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#1a7a4a] rounded-lg hover:bg-[#145e38] disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
