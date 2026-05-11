"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart, CreditCard, MapPin } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { checkoutSchema, type CheckoutFormData } from "@/lib/validations/checkout";
import { cn } from "@/lib/utils/cn";
import { detectCardType, formatExpiry } from "@/lib/utils/card";
import { CARD_LABELS } from "@/lib/utils/card";
import type { Address, PaymentMethod, CardType } from "@/types";
import CardNumberInput from "@/components/ui/CardNumberInput";
import AddressSelectModal from "./AddressSelectModal";
import PaymentSelectModal from "./PaymentSelectModal";
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
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
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
    "w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-colors bg-white dark:bg-gray-800",
    "placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-gray-300 dark:border-gray-600 focus:border-[#00539F] focus:ring-2 focus:ring-blue-100"
  );

export default function CheckoutPageContent() {
  const router    = useRouter();
  const { items, totalPrice, clearCart, loading: cartLoading, loaded: cartLoaded } = useCartStore();
  const { user, token, hasHydrated }  = useAuthStore();
  const [promoCode, setPromoCode] = useState<string | undefined>();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [savedPayments, setSavedPayments] = useState<PaymentMethod[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver:      zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.name  ?? "",
      email:    user?.email ?? "",
    },
  });

  const expiryValue = useWatch({ control, name: "expiry" }) ?? "";

  useEffect(() => {
    if (!token || !user) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get<{ data: Address[] }>("/api/account/addresses", { headers }),
      axios.get<{ data: PaymentMethod[] }>("/api/account/payment-methods", { headers }),
    ])
      .then(([addrRes, pmRes]) => {
        const addresses = addrRes.data.data ?? [];
        const payments  = pmRes.data.data  ?? [];
        setSavedAddresses(addresses);
        setSavedPayments(payments);

        const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
        const defaultPm   = payments.find((p) => p.isDefault)  ?? payments[0]  ?? null;

        if (defaultAddr) {
          setSelectedAddress(defaultAddr);
          setValue("fullName", defaultAddr.fullName);
          setValue("phone",    defaultAddr.phone);
          setValue("address",  defaultAddr.line1 + (defaultAddr.line2 ? `, ${defaultAddr.line2}` : ""));
          setValue("city",     defaultAddr.city);
          setValue("postcode", defaultAddr.postcode);
        }

        if (defaultPm) {
          setSelectedPayment(defaultPm);
          setValue("cardNumber", `**** **** **** ${defaultPm.lastFour}`);
          setValue("cardName",   defaultPm.cardholderName);
          setValue("expiry",     `${defaultPm.expiryMonth}/${defaultPm.expiryYear}`);
          setValue("cvv",        "000");
        }
      })
      .catch(() => {
        // Non-fatal — user can still enter details manually
      });
  // setValue is stable; including it avoids lint warning without causing re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  function applyAddress(addr: Address | null) {
    setSelectedAddress(addr);
    if (addr) {
      setValue("fullName", addr.fullName);
      setValue("phone",    addr.phone);
      setValue("address",  addr.line1 + (addr.line2 ? `, ${addr.line2}` : ""));
      setValue("city",     addr.city);
      setValue("postcode", addr.postcode);
    }
  }

  function applyPayment(pm: PaymentMethod | null) {
    setSelectedPayment(pm);
    if (pm) {
      setValue("cardNumber", `**** **** **** ${pm.lastFour}`);
      setValue("cardName",   pm.cardholderName);
      setValue("expiry",     `${pm.expiryMonth}/${pm.expiryYear}`);
      setValue("cvv",        "000");
    } else {
      setValue("cardNumber", "");
      setValue("cardName",   "");
      setValue("expiry",     "");
      setValue("cvv",        "");
    }
  }

  if (!hasHydrated || !cartLoaded || cartLoading) return <CheckoutLoading />;

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

      const deliveryFields = selectedAddress
        ? {
            fullName: selectedAddress.fullName,
            email:    data.email,
            phone:    selectedAddress.phone,
            address:  selectedAddress.line1 + (selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""),
            city:     selectedAddress.city,
            postcode: selectedAddress.postcode,
          }
        : {
            fullName: data.fullName,
            email:    data.email,
            phone:    data.phone,
            address:  data.address,
            city:     data.city,
            postcode: data.postcode,
          };

      let paymentFields: {
        cardType: CardType;
        lastFour: string;
        cardName: string;
      };

      if (selectedPayment) {
        paymentFields = {
          cardType: selectedPayment.cardType,
          lastFour: selectedPayment.lastFour,
          cardName: selectedPayment.cardholderName,
        };
      } else {
        const digits  = data.cardNumber.replace(/\D/g, "");
        paymentFields = {
          cardType: detectCardType(data.cardNumber),
          lastFour: digits.slice(-4),
          cardName: data.cardName,
        };
      }

      const { data: json } = await axios.post("/api/orders", {
        form:      { ...deliveryFields, ...paymentFields, cardNumber: data.cardNumber, expiry: data.expiry, cvv: data.cvv },
        items:     orderItems,
        userId:    user?._id,
        promoCode,
      });

      if (token) void clearCart(token);
      const { orderNumber } = json.data as { orderNumber: string };
      const params = new URLSearchParams({
        order: orderNumber,
        email: data.email,
        total: String(totalPrice.toFixed(2)),
      });
      router.push(`/checkout/confirmation?${params.toString()}`);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Failed to place order. Please try again."
        : "Something went wrong. Please try again.";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-8">Checkout</h1>

      <form
        id="checkout-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left column ───────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Delivery section */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-5">
                <MapPin className="h-5 w-5 text-[#00539F]" aria-hidden />
                Delivery details
              </h2>

              {user && savedAddresses.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700 dark:text-gray-300 min-w-0">
                    {selectedAddress ? (
                      <>
                        <p className="font-semibold truncate">{selectedAddress.fullName}</p>
                        <p className="text-gray-500 dark:text-gray-400 truncate">
                          {selectedAddress.line1}, {selectedAddress.city}, {selectedAddress.postcode}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-400">No address selected</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className="shrink-0 text-xs font-semibold text-[#00539F] hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

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
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-1">
                <CreditCard className="h-5 w-5 text-[#00539F]" aria-hidden />
                Payment details
              </h2>
              <p className="text-xs text-gray-400 mb-5">
                Demo only — no real payment is processed.
              </p>

              {user && savedPayments.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700 dark:text-gray-300 min-w-0">
                    {selectedPayment ? (
                      <>
                        <p className="font-semibold">
                          {CARD_LABELS[selectedPayment.cardType as CardType]} ending {selectedPayment.lastFour}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {selectedPayment.cardholderName} · {selectedPayment.expiryMonth}/{selectedPayment.expiryYear}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-400">No card selected</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="shrink-0 text-xs font-semibold text-[#00539F] hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
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
                    value={expiryValue ?? ""}
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
            </section>
          </div>

          {/* ── Right column (sticky) ──────────────────────── */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
              <OrderReview items={items} />
              <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
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

      {showAddressModal && (
        <AddressSelectModal
          addresses={savedAddresses}
          selected={selectedAddress}
          onSelect={applyAddress}
          onClose={() => setShowAddressModal(false)}
        />
      )}

      {showPaymentModal && (
        <PaymentSelectModal
          payments={savedPayments}
          selected={selectedPayment}
          onSelect={applyPayment}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
