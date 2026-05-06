"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart, CreditCard, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { checkoutSchema, type CheckoutFormData } from "@/lib/validations/checkout";
import { cn } from "@/lib/utils/cn";
import OrderReview from "./OrderReview";
import CheckoutPricingSummary from "./CheckoutPricingSummary";
import CheckoutLoading from "@/app/(shop)/checkout/loading";

function Field({
  label, error, children,
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
      {error?.message && (
        <p className="text-xs text-red-600">{error.message}</p>
      )}
    </div>
  );
}

const inputCls = (hasError?: boolean) =>
  cn(
    "w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-colors bg-white",
    "placeholder:text-gray-400 text-gray-900",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-gray-300 focus:border-[#00539F] focus:ring-2 focus:ring-blue-100"
  );

export default function CheckoutPageContent() {
  const router    = useRouter();
  const hydrated  = useHydrated();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user }  = useAuthStore();
  const [promoCode, setPromoCode] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver:      zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.name  ?? "",
      email:    user?.email ?? "",
    },
  });

  if (!hydrated) return <CheckoutLoading />;

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="inline-flex bg-gray-100 rounded-full p-5 mb-5">
          <ShoppingCart className="h-12 w-12 text-gray-400" aria-hidden />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 text-sm mb-6">Add some items before checking out.</p>
        <Link
          href="/products"
          className="px-6 py-2.5 bg-[#00539F] text-white font-semibold rounded-xl text-sm hover:bg-[#003B7A] transition-colors"
        >
          Browse products
        </Link>
      </div>
    );
  }

  async function onSubmit(data: CheckoutFormData) {
    try {
      const orderItems = items.map((i) => ({
        productId: i.product._id,
        name:      i.product.name,
        slug:      i.product.slug,
        price:     i.product.price,
        quantity:  i.quantity,
        image:     i.product.images[0] ?? "",
      }));

      const res = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          form:      data,
          items:     orderItems,
          userId:    user?._id,
          promoCode,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to place order. Please try again.");
        return;
      }

      clearCart();
      const { orderNumber } = json.data;
      const params = new URLSearchParams({
        order: orderNumber,
        email: data.email,
        total: String(totalPrice.toFixed(2)),
      });
      router.push(`/checkout/confirmation?${params.toString()}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Checkout</h1>

      <form
        id="checkout-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left column ───────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Delivery section */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="flex items-center gap-2 font-black text-gray-900 mb-5">
                <MapPin className="h-5 w-5 text-[#00539F]" aria-hidden />
                Delivery details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" error={errors.fullName}>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    className={inputCls(!!errors.fullName)}
                    {...register("fullName")}
                  />
                </Field>

                <Field label="Email address" error={errors.email}>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={inputCls(!!errors.email)}
                    {...register("email")}
                  />
                </Field>

                <Field label="Phone number" error={errors.phone}>
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="07700 900000"
                    className={inputCls(!!errors.phone)}
                    {...register("phone")}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Address" error={errors.address}>
                    <input
                      type="text"
                      autoComplete="street-address"
                      placeholder="123 High Street"
                      className={inputCls(!!errors.address)}
                      {...register("address")}
                    />
                  </Field>
                </div>

                <Field label="City" error={errors.city}>
                  <input
                    type="text"
                    autoComplete="address-level2"
                    placeholder="London"
                    className={inputCls(!!errors.city)}
                    {...register("city")}
                  />
                </Field>

                <Field label="Postcode" error={errors.postcode}>
                  <input
                    type="text"
                    autoComplete="postal-code"
                    placeholder="SW1A 1AA"
                    className={cn(inputCls(!!errors.postcode), "uppercase")}
                    {...register("postcode")}
                  />
                </Field>
              </div>
            </section>

            {/* Payment section */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="flex items-center gap-2 font-black text-gray-900 mb-1">
                <CreditCard className="h-5 w-5 text-[#00539F]" aria-hidden />
                Payment details
              </h2>
              <p className="text-xs text-gray-400 mb-5">
                Demo only — no real payment is processed.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Card number" error={errors.cardNumber}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className={inputCls(!!errors.cardNumber)}
                      {...register("cardNumber")}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Name on card" error={errors.cardName}>
                    <input
                      type="text"
                      autoComplete="cc-name"
                      placeholder="Jane Smith"
                      className={inputCls(!!errors.cardName)}
                      {...register("cardName")}
                    />
                  </Field>
                </div>

                <Field label="Expiry (MM/YY)" error={errors.expiry}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="12/26"
                    maxLength={5}
                    className={inputCls(!!errors.expiry)}
                    {...register("expiry")}
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
            </section>
          </div>

          {/* ── Right column (sticky) ──────────────────────── */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <OrderReview items={items} />
              <div className="border-t border-gray-100 pt-5">
                <CheckoutPricingSummary
                  subtotal={totalPrice}
                  isSubmitting={isSubmitting}
                  onPromoChange={setPromoCode}
                />
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
