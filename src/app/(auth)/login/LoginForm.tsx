"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { useAuthStore } from "@/store/auth.store";
import AuthFormField from "@/components/auth/AuthFormField";

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const setAuth      = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);

  const redirect = searchParams.get("redirect") ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFormData) {
    try {
      const { data: json } = await axios.post("/api/auth/login", data);
      setAuth(json.data.user, json.data.token);
      toast.success(`Welcome back, ${json.data.user.name.split(" ")[0]}!`);
      router.push(redirect);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Login failed. Please check your credentials."
        : "Something went wrong. Please try again.";
      toast.error(msg);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Heading */}
        <div className="mb-7 text-center">
          <div className="w-12 h-12 bg-[#00539F] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-xl">T</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Sign in</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back to Tesco</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <span className="text-xs text-[#00539F] hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                className={[
                  "w-full px-3.5 py-2.5 pr-10 text-sm border rounded-xl outline-none transition-colors",
                  "placeholder:text-gray-400 text-gray-900 bg-white",
                  errors.password
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-gray-300 focus:border-[#00539F] focus:ring-2 focus:ring-blue-100",
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#00539F] hover:bg-[#003B7A] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#00539F] font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
