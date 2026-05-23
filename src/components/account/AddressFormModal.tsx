"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useScrollLock } from "@/hooks/useScrollLock";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Navigation } from "lucide-react";
import { addressSchema, type AddressFormData } from "@/lib/validations/address";
import { cn } from "@/lib/utils/cn";
import { apiClient } from "@/lib/axios";
import type { Address } from "@/types";
import type { ReverseGeocodeResult } from "@/app/api/places/reverse-geocode/route";
import AddressAutocomplete, { type AddressFields } from "@/components/forms/AddressAutocomplete";

const inputCls = (hasError?: boolean) =>
  cn(
    "w-full px-3.5 py-2.5 text-base md:text-sm border rounded-xl outline-none transition-colors bg-white dark:bg-gray-800",
    "placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-gray-300 dark:border-gray-600 focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15",
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
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error?.message && <p className="text-xs text-red-600">{error.message}</p>}
    </div>
  );
}

interface AddressFormModalProps {
  mode:     "add" | "edit";
  initial?: Address;
  onClose:  () => void;
  onSave:   (data: AddressFormData) => Promise<void>;
}

export default function AddressFormModal({
  mode,
  initial,
  onClose,
  onSave,
}: AddressFormModalProps) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial
      ? {
          label:       initial.label,
          customLabel: initial.customLabel ?? "",
          fullName:    initial.fullName,
          phone:       initial.phone.replace(/\D/g, "").slice(0, 10),
          line1:       initial.line1,
          line2:       initial.line2 ?? "",
          city:        initial.city,
          postcode:    initial.postcode,
          country:     initial.country,
          isDefault:   initial.isDefault,
        }
      : { label: "Home", country: "United Kingdom", isDefault: false },
  });

  const label = useWatch({ control, name: "label" });
  const line1 = useWatch({ control, name: "line1" }) ?? "";

  useScrollLock(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(field: keyof AddressFormData, val: string) {
    setValue(field, val, { shouldValidate: true, shouldDirty: true });
  }

  const handleAddressSelect = useCallback(
    (fields: AddressFields) => {
      set("line1",    fields.line1);
      if (fields.line2)    set("line2",    fields.line2);
      if (fields.city)     set("city",     fields.city);
      if (fields.postcode) set("postcode", fields.postcode);
      if (fields.country)  set("country",  fields.country);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setValue],
  );

  const handleUseLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { data: json } = await apiClient.get<{ success: boolean; data?: ReverseGeocodeResult }>(
            `/api/places/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`,
          );

          if (!json.data) {
            setLocError("Could not determine your address.");
            return;
          }

          const { line1, line2, city, postcode, country } = json.data;
          if (line1)    set("line1",    line1);
          if (line2)    set("line2",    line2);
          if (city)     set("city",     city);
          if (postcode) set("postcode", postcode);
          if (country)  set("country",  country);
        } catch {
          setLocError("Failed to fetch your address. Please try again.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please allow access or enter manually."
            : "Unable to retrieve your location. Please enter manually.",
        );
      },
      { timeout: 10000 },
    );
  }, [setValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-black text-gray-900 dark:text-white">
            {mode === "add" ? "Add address" : "Edit address"}
          </h2>
          <button
            onClick={onClose}
            data-testid="address-form-close"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} data-testid="address-form" className="p-6 space-y-4">

          {/* Use my location */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={locating}
              className="flex items-center gap-2 px-4 py-2.5 w-full rounded-xl border border-dashed border-[#FCA311]/60 text-sm font-semibold text-[#FCA311] hover:bg-amber-50 dark:hover:bg-amber-950/20 disabled:opacity-60 transition-colors"
            >
              {locating
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Navigation className="h-4 w-4" />}
              {locating ? "Detecting your location…" : "Use my current location"}
            </button>
            {locError && <p className="text-xs text-red-600">{locError}</p>}
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">or fill manually</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <Field label="Label" error={errors.label}>
            <div className="flex gap-3">
              {(["Home", "Office", "Other"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="radio" value={opt} {...register("label")} className="accent-[#FCA311]" />
                  {opt}
                </label>
              ))}
            </div>
          </Field>

          {label === "Other" && (
            <Field label="Custom label" error={errors.customLabel}>
              <input type="text" placeholder="e.g. Parents' house" className={inputCls(!!errors.customLabel)} {...register("customLabel")} />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Full name" error={errors.fullName}>
                <input type="text" placeholder="Jane Smith" data-testid="address-form-fullname" className={inputCls(!!errors.fullName)} {...register("fullName")} />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Phone number" error={errors.phone}>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="9876543210"
                  maxLength={10}
                  data-testid="address-form-phone"
                  className={inputCls(!!errors.phone)}
                  {...register("phone")}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setValue("phone", numeric, { shouldValidate: true, shouldDirty: true });
                  }}
                />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Address line 1" error={errors.line1}>
                <AddressAutocomplete
                  value={line1}
                  error={errors.line1}
                  placeholder="Building, society or street…"
                  onChange={(v) => set("line1", v)}
                  onSelect={handleAddressSelect}
                />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Address line 2 (optional)" error={errors.line2}>
                <input type="text" placeholder="Flat 4B" className={inputCls(!!errors.line2)} {...register("line2")} />
              </Field>
            </div>

            <Field label="City" error={errors.city}>
              <input type="text" placeholder="London" data-testid="address-form-city" className={inputCls(!!errors.city)} {...register("city")} />
            </Field>

            <Field label="Postcode" error={errors.postcode}>
              <input type="text" placeholder="SW1A 1AA" data-testid="address-form-postcode" className={cn(inputCls(!!errors.postcode), "uppercase")} {...register("postcode")} />
            </Field>

            <div className="col-span-2">
              <Field label="Country" error={errors.country}>
                <input type="text" className={inputCls(!!errors.country)} {...register("country")} />
              </Field>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" {...register("isDefault")} className="accent-[#FCA311] h-4 w-4" />
            Set as default address
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="address-form-submit"
              className="flex-1 py-2.5 bg-[#FCA311] text-white text-sm font-semibold rounded-xl hover:bg-[#E8920A] disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? "Saving…" : mode === "add" ? "Add address" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
