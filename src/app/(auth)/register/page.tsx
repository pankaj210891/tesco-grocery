"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { useAuthStore } from "@/store/auth.store";
import AuthFormField from "@/components/auth/AuthFormField";

export default function RegisterPage() {
  const router             = useRouter();
  const setAuth            = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterFormData) {
    try {
      const { data: json } = await axios.post("/api/auth/register", data);
      setAuth(json.data.user, json.data.token);
      toast.success("Account created! Welcome to Prakash Supermarket.");
      router.push("/");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Registration failed."
        : "Something went wrong. Please try again.";
      toast.error(msg);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        {/* Heading */}
        <div className="mb-7 text-center">
          <div className="w-12 h-12 bg-[#0F4C75] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-xl">P</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Create an account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Join Prakash Supermarket and start shopping online
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <AuthFormField
            id="name"
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            error={errors.name}
            {...register("name")}
          />

          <AuthFormField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email}
            {...register("email")}
          />

          {/* Password with toggle */}
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Password
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
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-gray-300 dark:border-gray-600 focus:border-[#0F4C75] focus:ring-2 focus:ring-blue-100",
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
              <p className="text-xs text-red-600 mt-0.5">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password with toggle */}
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showCpw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={[
                  "w-full px-3.5 py-2.5 pr-10 text-sm border rounded-xl outline-none transition-colors",
                  "placeholder:text-gray-400 text-gray-900 bg-white",
                  errors.confirmPassword
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-gray-300 focus:border-[#0F4C75] focus:ring-2 focus:ring-blue-100",
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
              <p className="text-xs text-red-600 mt-0.5">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#0F4C75] hover:bg-[#0A3352] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#0F4C75] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4 px-4">
        By creating an account you agree to our{" "}
        <span className="underline cursor-pointer">Terms of Service</span> and{" "}
        <span className="underline cursor-pointer">Privacy Policy</span>.
      </p>
    </div>
  );
}
