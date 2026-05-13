"use client";

import { CreditCard, Truck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PaymentMethodType } from "@/types";

interface PaymentMethodSelectorProps {
  value:    PaymentMethodType | "";
  onChange: (method: PaymentMethodType) => void;
  error?:   { message?: string };
}

const OPTIONS: {
  id:          PaymentMethodType;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  badge?:      string;
}[] = [
  {
    id:          "razorpay",
    label:       "Pay Online",
    description: "Credit / Debit card, UPI, Net Banking, Wallets via Razorpay",
    icon:        <CreditCard className="h-5 w-5" />,
    badge:       "Secure",
  },
  {
    id:          "cod",
    label:       "Cash on Delivery",
    description: "Pay in cash when your order arrives at your door",
    icon:        <Truck className="h-5 w-5" />,
  },
];

export default function PaymentMethodSelector({
  value,
  onChange,
  error,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
              selected
                ? "border-[#00539F] bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
            )}
          >
            {/* Radio indicator */}
            <span
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                selected
                  ? "border-[#00539F] dark:border-blue-400"
                  : "border-gray-300 dark:border-gray-600"
              )}
            >
              {selected && (
                <span className="h-2 w-2 rounded-full bg-[#00539F] dark:bg-blue-400" />
              )}
            </span>

            {/* Icon */}
            <span
              className={cn(
                "shrink-0 p-2 rounded-lg transition-colors",
                selected
                  ? "bg-[#00539F] text-white dark:bg-blue-600"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              )}
            >
              {opt.icon}
            </span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    selected
                      ? "text-[#00539F] dark:text-blue-400"
                      : "text-gray-900 dark:text-white"
                  )}
                >
                  {opt.label}
                </span>
                {opt.badge && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <ShieldCheck className="h-3 w-3" />
                    {opt.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                {opt.description}
              </p>
            </div>
          </button>
        );
      })}

      {error?.message && (
        <p className="text-xs text-red-600 mt-1">{error.message}</p>
      )}
    </div>
  );
}
