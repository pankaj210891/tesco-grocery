"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Store, Mail, CheckCircle, ArrowLeft, Copy } from "lucide-react";
import axios from "axios";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [sent,      setSent]      = useState(false);
  const [resetUrl,  setResetUrl]  = useState("");
  const [copied,    setCopied]    = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordFormData) {
    try {
      const { data: json } = await axios.post<{ success: boolean; resetUrl?: string; message?: string; error?: string }>(
        "/api/auth/forgot-password",
        data,
      );
      setSent(true);
      if (json.resetUrl) setResetUrl(json.resetUrl);
    } catch {
      setSent(true); // Always show "sent" to prevent email enumeration
    }
  }

  function copyLink() {
    const full = `${window.location.origin}${resetUrl}`;
    void navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        {/* Heading */}
        <div className="mb-7 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#FCA311" }}>
            <Store className="h-6 w-6 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Forgot password?</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Check your email</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  If <strong>{getValues("email")}</strong> has an account, a password reset link was sent.
                </p>
              </div>
            </div>

            {/* Demo-only: show the reset link since we have no real email service */}
            {resetUrl && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-2">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Demo mode — reset link
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 break-all">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}${resetUrl}`}
                </p>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <Link
                  href={resetUrl}
                  className="block mt-1 text-center py-2 rounded-xl bg-[#FCA311] text-white text-sm font-bold hover:bg-[#E8920A] transition-colors"
                >
                  Open reset link
                </Link>
              </div>
            )}

            <button
              onClick={() => { setSent(false); setResetUrl(""); }}
              className="w-full text-center text-sm text-[#FCA311] hover:underline font-semibold"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={[
                    "w-full pl-10 pr-3.5 py-2.5 text-base border rounded-xl outline-none transition-colors",
                    "placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800",
                    errors.email
                      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30"
                      : "border-gray-300 dark:border-gray-600 focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15",
                  ].join(" ")}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-2 hover:brightness-105 active:scale-95"
              style={{ backgroundColor: "#FCA311" }}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mt-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
