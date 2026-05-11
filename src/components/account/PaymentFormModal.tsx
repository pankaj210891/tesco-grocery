"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { detectCardType, formatExpiry } from "@/lib/utils/card";
import CardNumberInput from "@/components/ui/CardNumberInput";
import { cn } from "@/lib/utils/cn";

const paymentFormSchema = z.object({
  cardNumber:      z.string().min(12, "Enter a valid card number"),
  cardholderName:  z.string().min(2, "Name on card is required"),
  expiry:          z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Format: MM/YY"),
  cvv:             z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
  isDefault:       z.boolean(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const inputCls = (hasError?: boolean) =>
  cn(
    "w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-colors bg-white",
    "placeholder:text-gray-400 text-gray-900",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-gray-300 focus:border-[#00539F] focus:ring-2 focus:ring-blue-100"
  );

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: { message?: string };
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error?.message && <p className="text-xs text-red-600">{error.message}</p>}
    </div>
  );
}

export interface PaymentSaveData {
  cardType: string;
  lastFour: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  isDefault: boolean;
}

interface PaymentFormModalProps {
  onClose: () => void;
  onSave: (data: PaymentSaveData) => Promise<void>;
}

export default function PaymentFormModal({ onClose, onSave }: PaymentFormModalProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { cardNumber: "", cardholderName: "", expiry: "", cvv: "", isDefault: false },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const expiryValue = useWatch({ control, name: "expiry" }) ?? "";

  async function onSubmit(values: PaymentFormValues) {
    const digits = values.cardNumber.replace(/\D/g, "");
    const lastFour = digits.slice(-4);
    const cardType = detectCardType(values.cardNumber);
    const [expiryMonth, expiryYear] = values.expiry.split("/");
    await onSave({ cardType, lastFour, expiryMonth, expiryYear, cardholderName: values.cardholderName, isDefault: values.isDefault });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-black text-gray-900">Add payment card</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Field label="Card number" error={errors.cardNumber}>
            <Controller
              name="cardNumber"
              control={control}
              render={({ field }) => (
                <CardNumberInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.cardNumber}
                />
              )}
            />
          </Field>

          <Field label="Name on card" error={errors.cardholderName}>
            <input
              type="text"
              placeholder="Jane Smith"
              autoComplete="cc-name"
              className={inputCls(!!errors.cardholderName)}
              {...register("cardholderName")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry (MM/YY)" error={errors.expiry}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="12/26"
                maxLength={5}
                value={expiryValue}
                onChange={(e) => setValue("expiry", formatExpiry(e.target.value))}
                className={inputCls(!!errors.expiry)}
              />
            </Field>

            <Field label="CVV" error={errors.cvv}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="123"
                maxLength={4}
                className={inputCls(!!errors.cvv)}
                {...register("cvv")}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input
              type="checkbox"
              {...register("isDefault")}
              className="accent-[#00539F] h-4 w-4"
            />
            Set as default payment method
          </label>

          <p className="text-xs text-gray-400">
            Demo only — no real payment is processed. Card numbers are not stored.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#00539F] text-white text-sm font-semibold rounded-xl hover:bg-[#003B7A] disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? "Saving…" : "Add card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
