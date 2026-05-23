"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart, MapPin, CreditCard, Clock } from "lucide-react";
import { authClient, apiClient } from "@/lib/axios";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useDeliverySlotStore } from "@/store/delivery-slot.store";
import { checkoutSchema, type CheckoutFormData } from "@/lib/validations/checkout";
import { cn } from "@/lib/utils/cn";
import type { Address, PaymentMethodType, DeliverySlotBooking, Wallet } from "@/types";
import type { AddressFormData } from "@/lib/validations/address";
import AddressSelectModal from "./AddressSelectModal";
import AddressFormModal from "@/components/account/AddressFormModal";
import OrderReview from "./OrderReview";
import CheckoutPricingSummary from "./CheckoutPricingSummary";
import PaymentMethodSelector from "./PaymentMethodSelector";
import DeliverySlotSelector from "./DeliverySlotSelector";
import CheckoutLoading from "@/app/(shop)/checkout/loading";

// Razorpay window type augmentation
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void };
  }
}

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
    "w-full px-3.5 py-2.5 text-base md:text-sm border rounded-xl outline-none transition-colors bg-white dark:bg-gray-800",
    "placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-gray-300 dark:border-gray-600 focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/15"
  );

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src   = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPageContent() {
  const router    = useRouter();
  const { items, totalPrice, promoCode, clearCart, loading: cartLoading, loaded: cartLoaded } = useCartStore();
  const { user, token, hasHydrated } = useAuthStore();
  const { pendingSlot, clearPendingSlot } = useDeliverySlotStore();

  const [savedAddresses,      setSavedAddresses]      = useState<Address[]>([]);
  const [selectedAddress,     setSelectedAddress]     = useState<Address | null>(null);
  const [showAddressModal,    setShowAddressModal]    = useState(false);
  const [showAddressFormModal,setShowAddressFormModal]= useState(false);
  const [deliverySlot,        setDeliverySlot]        = useState<DeliverySlotBooking | null>(null);
  const [slotInitialized,     setSlotInitialized]     = useState(false);
  const [wallet,              setWallet]              = useState<Wallet | null>(null);
  const [walletLoading,       setWalletLoading]       = useState(true);

  // Pre-fill from account slot planner
  useEffect(() => {
    if (!slotInitialized && pendingSlot) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeliverySlot(pendingSlot);
      setSlotInitialized(true);
    }
  }, [pendingSlot, slotInitialized]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver:      zodResolver(checkoutSchema),
    defaultValues: {
      fullName:      user?.name  ?? "",
      email:         user?.email ?? "",
      phone:         "",
      address:       "",
      city:          "",
      postcode:      "",
      paymentMethod: undefined,
    },
  });

  const postcodeValue = useWatch({ control, name: "postcode"      }) ?? "";
  const paymentMethod = useWatch({ control, name: "paymentMethod" }) as PaymentMethodType | undefined;

  useEffect(() => {
    if (!token || !user) return;

    authClient(token).get<{ data: Address[] }>("/api/account/addresses")
      .then((res) => {
        const addresses = res.data.data ?? [];
        setSavedAddresses(addresses);
        const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
        if (defaultAddr) {
          setSelectedAddress(defaultAddr);
          setValue("fullName", defaultAddr.fullName);
          setValue("phone",    defaultAddr.phone.replace(/\D/g, "").slice(0, 10));
          setValue("address",  defaultAddr.line1 + (defaultAddr.line2 ? `, ${defaultAddr.line2}` : ""));
          setValue("city",     defaultAddr.city);
          setValue("postcode", defaultAddr.postcode);
        }
      })
      .catch(() => { /* non-fatal */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  // Fetch wallet balance when user is logged in
  useEffect(() => {
    if (!token || !user) return;
    async function fetchWallet() {
      try {
        const res = await authClient(token!).get<{ data: Wallet }>("/api/account/wallet");
        setWallet(res.data.data ?? null);
      } catch {
        // non-fatal — wallet section just won't show balance
      } finally {
        setWalletLoading(false);
      }
    }
    void fetchWallet();
  }, [token, user]);

  function applyAddress(addr: Address | null) {
    setSelectedAddress(addr);
    if (addr) {
      setValue("fullName", addr.fullName);
      setValue("phone",    addr.phone.replace(/\D/g, "").slice(0, 10));
      setValue("address",  addr.line1 + (addr.line2 ? `, ${addr.line2}` : ""));
      setValue("city",     addr.city);
      setValue("postcode", addr.postcode);
    }
  }

  async function handleNewAddressSave(data: AddressFormData) {
    const res = await authClient(token!).post<{ data: Address }>("/api/account/addresses", data);
    const newAddr = res.data.data;
    setSavedAddresses((prev) => [...prev, newAddr]);
    applyAddress(newAddr);
    setShowAddressFormModal(false);
    toast.success("Address added and selected");
  }

  const buildOrderItems = useCallback(() =>
    items.map((i) => ({
      productId:    i.product._id,
      variantId:    i.variantId    ?? undefined,
      variantLabel: i.selectedVariant?.label ?? undefined,
      name:         i.product.name,
      slug:         i.product.slug,
      price:        i.selectedVariant?.price != null ? i.selectedVariant.price : i.product.price,
      quantity:     i.quantity,
      image:        i.product.images[0] ?? "",
      category:     i.product.category,
    }))
  , [items]);

  const buildDelivery = useCallback((data: CheckoutFormData) => ({
    fullName: data.fullName,
    email:    data.email,
    phone:    data.phone,
    address:  data.address,
    city:     data.city,
    postcode: data.postcode,
  }), []);

  async function handleRazorpay(data: CheckoutFormData) {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error("Failed to load Razorpay. Please check your connection and try again.");
      return;
    }

    const orderItems = buildOrderItems();
    const delivery   = buildDelivery(data);

    const { data: json } = await apiClient.post("/api/payments/razorpay/create-order", {
      delivery,
      items:        orderItems,
      promoCode:    promoCode ?? undefined,
      userId:       user?._id,
      deliverySlot: deliverySlot ?? undefined,
    });

    const { razorpayOrderId, amount, currency, keyId } = json.data as {
      razorpayOrderId: string;
      amount:          number;
      currency:        string;
      keyId:           string;
    };

    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key:         keyId,
        amount,
        currency,
        order_id:    razorpayOrderId,
        name:        "Prakash Supermarket",
        description: "Order payment",
        prefill: {
          name:    delivery.fullName,
          email:   delivery.email,
          contact: delivery.phone,
        },
        theme: { color: "#FCA311" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id:   string;
          razorpay_signature:  string;
        }) => {
          try {
            const verifyRes = await apiClient.post("/api/payments/razorpay/verify", {
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              delivery,
              items:        orderItems,
              promoCode:    promoCode ?? undefined,
              userId:       user?._id,
              deliverySlot: deliverySlot ?? undefined,
            });

            const { orderNumber, total: serverTotal } = verifyRes.data.data as {
              orderNumber: string;
              total:       number;
            };

            if (token) void clearCart(token);
            clearPendingSlot();

            const params = new URLSearchParams({
              order: orderNumber,
              email: delivery.email,
              total: serverTotal.toFixed(2),
              pm:    "razorpay",
            });
            router.push(`/checkout/confirmation?${params.toString()}`);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error("cancelled")) },
      });
      rzp.open();
    });
  }

  async function handleCOD(data: CheckoutFormData) {
    const orderItems = buildOrderItems();
    const delivery   = buildDelivery(data);

    const { data: json } = await apiClient.post("/api/payments/cod", {
      delivery,
      items:        orderItems,
      promoCode:    promoCode ?? undefined,
      userId:       user?._id,
      deliverySlot: deliverySlot ?? undefined,
    });

    const { orderNumber, total: serverTotal } = json.data as {
      orderNumber: string;
      total:       number;
    };

    if (token) void clearCart(token);
    clearPendingSlot();

    const params = new URLSearchParams({
      order: orderNumber,
      email: delivery.email,
      total: serverTotal.toFixed(2),
      pm:    "cod",
    });
    router.push(`/checkout/confirmation?${params.toString()}`);
  }

  async function handleWallet(data: CheckoutFormData) {
    if (!user?._id || !token) {
      toast.error("Please sign in to pay with your wallet.");
      return;
    }
    const orderItems = buildOrderItems();
    const delivery   = buildDelivery(data);

    const { data: json } = await authClient(token).post("/api/payments/wallet", {
      delivery,
      items:        orderItems,
      promoCode:    promoCode ?? undefined,
      userId:       user._id,
      deliverySlot: deliverySlot ?? undefined,
    });

    const { orderNumber, total: serverTotal, walletBalance } = json.data as {
      orderNumber:   string;
      total:         number;
      walletBalance: number;
    };

    // Update local wallet balance
    if (wallet) setWallet({ ...wallet, balance: walletBalance });

    if (token) void clearCart(token);
    clearPendingSlot();

    const params = new URLSearchParams({
      order: orderNumber,
      email: delivery.email,
      total: serverTotal.toFixed(2),
      pm:    "wallet",
    });
    router.push(`/checkout/confirmation?${params.toString()}`);
  }

  async function onSubmit(data: CheckoutFormData) {
    try {
      if (data.paymentMethod === "razorpay") {
        await handleRazorpay(data);
      } else if (data.paymentMethod === "wallet") {
        await handleWallet(data);
      } else {
        await handleCOD(data);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "cancelled") return;
      const msg = err instanceof Error
        ? err.message
        : "Something went wrong. Please try again.";
      toast.error(msg);
    }
  }

  if (!hasHydrated || !cartLoaded || cartLoading) return <CheckoutLoading />;

  if (!user || !token) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="h-9 w-9 text-[#FCA311]" aria-hidden />
        </div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white mb-2">Sign in to checkout</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
          You need to be signed in to place an order.
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FCA311] text-white font-semibold rounded-xl text-sm hover:bg-[#E8920A] transition-colors">
          Sign in
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="h-9 w-9 text-gray-400 dark:text-gray-500" aria-hidden />
        </div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white mb-2">Your cart is empty</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
          Add some items before checking out.
        </p>
        <Link href="/products" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FCA311] text-white font-semibold rounded-xl text-sm hover:bg-[#E8920A] transition-colors">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Checkout</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {items.reduce((s, i) => s + i.quantity, 0)} items · Complete your order below
        </p>
      </div>

      <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left column ──────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-5">

            {/* ── Section 1: Delivery details ── */}
            <section className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                <div className="w-7 h-7 rounded-full bg-[#FCA311] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-black">1</span>
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#FCA311]" aria-hidden />
                  Delivery Details
                </h2>
              </div>

              <div className="p-5">
              {user && savedAddresses.length > 0 && (
                <div className="mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700 dark:text-gray-300 min-w-0">
                    {selectedAddress ? (
                      <>
                        <p className="font-semibold truncate">{selectedAddress.fullName}</p>
                        <p className="text-gray-500 dark:text-gray-400 truncate text-xs mt-0.5">
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
                    className="shrink-0 text-xs font-bold text-[#FCA311] hover:underline whitespace-nowrap"
                  >
                    Change address
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
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    className={inputCls(!!errors.phone)}
                    {...register("phone")}
                    onChange={(e) => {
                      const numeric = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setValue("phone", numeric, { shouldValidate: true, shouldDirty: true });
                    }}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Street address" error={errors.address}>
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
                    placeholder="Mumbai"
                    className={inputCls(!!errors.city)}
                    {...register("city")}
                  />
                </Field>

                <Field label="Postcode / PIN" error={errors.postcode}>
                  <input
                    type="text"
                    autoComplete="postal-code"
                    placeholder="400001"
                    className={cn(inputCls(!!errors.postcode), "uppercase")}
                    {...register("postcode")}
                  />
                </Field>
              </div>
              </div>
            </section>

            {/* ── Section 2: Delivery Slot ── */}
            <section className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                <div className="w-7 h-7 rounded-full bg-[#FCA311] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-black">2</span>
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#FCA311]" aria-hidden />
                  Delivery Slot
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </h2>
              </div>
              <div className="p-5">
                <DeliverySlotSelector value={deliverySlot} onChange={setDeliverySlot} />
              </div>
            </section>

            {/* ── Section 3: Payment ── */}
            <section className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                <div className="w-7 h-7 rounded-full bg-[#FCA311] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-black">3</span>
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#FCA311]" aria-hidden />
                  Payment Method
                </h2>
              </div>

              <div className="p-5">
                <PaymentMethodSelector
                  value={paymentMethod ?? ""}
                  onChange={(m) => setValue("paymentMethod", m, { shouldValidate: true })}
                  error={errors.paymentMethod}
                  walletBalance={walletLoading ? undefined : (wallet?.balance ?? 0)}
                  orderTotal={totalPrice}
                />

                {paymentMethod === "razorpay" && (
                  <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    256-bit SSL secured — your card details are never stored by us
                  </p>
                )}
                {paymentMethod === "cod" && (
                  <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                    Please keep the exact amount ready at delivery. COD orders are confirmed immediately.
                  </p>
                )}
                {paymentMethod === "wallet" && (
                  <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    Instant payment — your order is confirmed immediately.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* ── Right column (sticky) ────────────────────────── */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-4">
            <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Order Summary</h3>
              </div>
              <div className="p-5 space-y-5">
                <OrderReview items={items} />
                <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
                  <CheckoutPricingSummary
                    subtotal={totalPrice}
                    postcode={postcodeValue}
                    isSubmitting={isSubmitting}
                    paymentMethod={paymentMethod}
                    walletBalance={wallet?.balance}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </form>

      {showAddressModal && (
        <AddressSelectModal
          addresses={savedAddresses}
          selected={selectedAddress}
          onSelect={(addr) => { applyAddress(addr); setShowAddressModal(false); }}
          onClose={() => setShowAddressModal(false)}
          onAddNew={() => setShowAddressFormModal(true)}
        />
      )}

      {showAddressFormModal && (
        <AddressFormModal
          mode="add"
          onClose={() => setShowAddressFormModal(false)}
          onSave={handleNewAddressSave}
        />
      )}
    </div>
  );
}
