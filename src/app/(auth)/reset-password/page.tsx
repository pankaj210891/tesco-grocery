"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Store, CheckCircle, AlertCircle } from "lucide-react";
import axios from "axios";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validations/auth";

function ResetPasswordForm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const token       = searchParams.get("token") ?? "";
  const [showPw,    setShowPw]    = useState(false);
  const [showCpw,   setShowCpw]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [apiError,  setApiError]  = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(data: ResetPasswordFormData) {
    setApiError("");
    try {
      await axios.post("/api/auth/reset-password", {
        token:    data.token,
        password: data.password,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setApiError(msg ?? "Failed to reset password. The link may have expired.");
    }
  }

  if (!token) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <p className="font-bold text-gray-900 dark:text-white mb-1">Invalid reset link</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          This reset link is missing a token. Please request a new one.
        </p>
        <Link href="/forgot-password" className="text-[#FCA311] font-semibold hover:underline text-sm">
          Request new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto">
          <CheckCircle className="h-7 w-7 text-green-500" />
        </div>
        <p className="font-bold text-gray-900 dark:text-white">Password reset!</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your password has been updated. Redirecting to sign in…
        </p>
        <Link href="/login" className="inline-block mt-2 text-[#FCA311] font-semibold hover:underline text-sm">
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <input type="hidden" {...register("token")} />

      {apiError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
        </div>
      )}

      {/* New password */}
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            className={[
              "w-full px-3.5 py-2.5 pr-10 text-sm border rounded-xl outline-none transition-colors",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800",
              errors.password
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30"
                : "border-gray-300 dark:border-gray-600 focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15",
            ].join(" ")}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showCpw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            className={[
              "w-full px-3.5 py-2.5 pr-10 text-sm border rounded-xl outline-none transition-colors",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800",
              errors.confirmPassword
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30"
                : "border-gray-300 dark:border-gray-600 focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15",
            ].join(" ")}
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowCpw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showCpw ? "Hide password" : "Show password"}
          >
            {showCpw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors transition-transform flex items-center justify-center gap-2 mt-2 hover:brightness-105 active:scale-95"
        style={{ backgroundColor: "#FCA311" }}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Resetting…" : "Reset password"}
      </button>

      <Link
        href="/login"
        className="block text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        Back to sign in
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <div className="mb-7 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#FCA311" }}>
            <Store className="h-6 w-6 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Reset password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Choose a new secure password for your account
          </p>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
