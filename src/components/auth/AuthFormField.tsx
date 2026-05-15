"use client";

import type { InputHTMLAttributes } from "react";
import type { FieldError } from "react-hook-form";
import { cn } from "@/lib/utils/cn";

interface AuthFormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label:  string;
  error?: FieldError;
}

export default function AuthFormField({
  label,
  error,
  id,
  className,
  ...props
}: AuthFormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "w-full px-3.5 py-2.5 text-base border rounded-xl outline-none transition-colors",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-gray-300 dark:border-gray-600 focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600 mt-0.5">{error.message}</p>
      )}
    </div>
  );
}
