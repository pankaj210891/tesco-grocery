"use client";

import { useEffect, useMemo, lazy, Suspense } from "react";
import Link from "next/link";
import { Trash2, ShoppingCart, ArrowRight, Store } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import CartItem from "@/components/cart/CartItem";
import OrderSummary from "@/components/cart/OrderSummary";
import CartSkeleton from "@/components/cart/CartSkeleton";
import SavedItemsSection from "@/components/cart/SavedItemsSection";

const CartRecommendations = lazy(
  () => import("@/components/cart/CartRecommendations")
);

// ── Vendor group ─────────────────────────────────────────────────────────────

interface VendorGroup {
  vendorId:   string | null;
  vendorName: string | null;
  items:      ReturnType<typeof useCartStore.getState>["items"];
  subtotal:   number;
}

export default function CartPageContent() {
  const { user, token, hasHydrated } = useAuthStore();
  const {
    items, totalItems, totalPrice,
    clearCart, loading, loaded,
    fetchSavedItems, savedLoaded,
  } = useCartStore();

  // Fetch saved items once logged in
  useEffect(() => {
    if (token && !savedLoaded) void fetchSavedItems(token);
  }, [token, savedLoaded, fetchSavedItems]);

  // ── Vendor groups ────────────────────────────────────────────────────────────
  const vendorGroups = useMemo<VendorGroup[]>(() => {
    const map = new Map<string, VendorGroup>();
    for (const item of items) {
      const key  = item.product.vendorId ?? "__marketplace__";
      const name = item.product.vendorName ?? null;
      if (!map.has(key)) {
        map.set(key, { vendorId: item.product.vendorId ?? null, vendorName: name, items: [], subtotal: 0 });
      }
      const g             = map.get(key)!;
      const effectivePrice = item.selectedVariant?.price != null ? item.selectedVariant.price : item.product.price;
      g.items.push(item);
      g.subtotal += effectivePrice * item.quantity;
    }
    return Array.from(map.values());
  }, [items]);

  const hasMultipleVendors = vendorGroups.length > 1;

  // ── Recommendation params (memoized) ─────────────────────────────────────────
  const cartItemIds   = useMemo(() => items.map((i) => i.product._id), [items]);
  const cartCategories = useMemo(
    () => Array.from(new Set(items.map((i) => i.product.category))),
    [items]
  );

  const isGuest = !user || !token;

  if (!hasHydrated) return <CartSkeleton />;

  // Guests with no local items: show a sign-in prompt
  if (isGuest && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-4">
        <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-6">
          <ShoppingCart className="h-9 w-9 text-[#FCA311]" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Your trolley is empty</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-8 leading-relaxed">
          Sign in to see your saved cart, or start browsing to add items.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#FCA311] text-white font-bold rounded-xl hover:bg-[#E8920A] transition-colors"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  // Logged-in users: wait for server cart to load
  if (!isGuest && (!loaded || loading)) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
          <ShoppingCart className="h-9 w-9 text-gray-400 dark:text-gray-500" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Your trolley is empty</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-8 leading-relaxed">
          Looks like you haven&apos;t added anything yet. Start browsing and fill it up!
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#FCA311] text-white font-bold rounded-xl hover:bg-[#E8920A] transition-colors"
        >
          Browse Products
          <ArrowRight className="h-4 w-4" />
        </Link>
        {/* Show saved items even when cart is empty */}
        <div className="w-full max-w-2xl mt-8">
          <SavedItemsSection />
        </div>
      </div>
    );
  }

  function handleClearCart() {
    void clearCart(token ?? null);
    toast.success("Trolley cleared");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-16">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Your Trolley
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{totalItems}</span>
            {" "}{totalItems === 1 ? "item" : "items"} in your trolley
          </p>
        </div>
        <button
          onClick={handleClearCart}
          data-testid="clear-cart"
          className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Clear trolley</span>
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

        {/* Left: Items list */}
        <div>
          {/* Section header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto] items-center pb-3 mb-3 border-b border-gray-100 dark:border-gray-700/60">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Product
            </span>
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pr-1">
              Total
            </span>
          </div>

          {/* Items — grouped by vendor when marketplace */}
          {hasMultipleVendors
            ? vendorGroups.map((group) => (
              <div key={group.vendorId ?? "marketplace"} className="mb-6">
                {/* Vendor header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-[#FCA311]" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {group.vendorName ?? "Marketplace"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Subtotal: <strong className="text-gray-900 dark:text-white">
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(group.subtotal)}
                    </strong>
                  </span>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <CartItem key={`${item.product._id}:${item.variantId ?? ""}`} item={item} />
                  ))}
                </div>
              </div>
            ))
            : (
              <div className="space-y-3">
                {items.map((item) => (
                  <CartItem key={`${item.product._id}:${item.variantId ?? ""}`} item={item} />
                ))}
              </div>
            )
          }

          {/* Continue shopping */}
          <div className="pt-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm text-[#FCA311] font-semibold hover:underline"
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* Saved for later — only for logged-in users */}
          {!isGuest && <SavedItemsSection />}

          {/* Recommendations */}
          <Suspense fallback={null}>
            <CartRecommendations
              cartItemIds={cartItemIds}
              cartCategories={cartCategories}
            />
          </Suspense>
        </div>

        {/* Right: Sticky summary (desktop) */}
        <div className="hidden lg:block">
          {isGuest ? (
            <GuestCheckoutPrompt totalPrice={totalPrice} totalItems={totalItems} />
          ) : (
            <OrderSummary subtotal={totalPrice} />
          )}
        </div>
      </div>

      {/* ── Mobile sticky checkout bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shadow-2xl">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
            <p className="text-base font-black text-gray-900 dark:text-white truncate">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalPrice)}
            </p>
          </div>
          {isGuest ? (
            <Link
              href="/login"
              data-testid="mobile-checkout-btn"
              className="shrink-0 px-6 py-3 bg-[#FCA311] text-white font-bold rounded-xl hover:bg-[#E8920A] transition-colors active:scale-[0.98]"
            >
              Sign in to checkout
            </Link>
          ) : (
            <Link
              href="/checkout"
              data-testid="mobile-checkout-btn"
              className="shrink-0 px-6 py-3 bg-[#FCA311] text-white font-bold rounded-xl hover:bg-[#E8920A] transition-colors active:scale-[0.98]"
            >
              Checkout →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Guest checkout prompt (replaces OrderSummary for unauthenticated users) ──

function GuestCheckoutPrompt({ totalPrice, totalItems }: { totalPrice: number; totalItems: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5 sticky top-20">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-gray-900 dark:text-white">Order Summary</h2>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-baseline justify-between">
        <span className="text-base font-bold text-gray-900 dark:text-white">Estimated total</span>
        <span className="text-2xl font-black text-gray-900 dark:text-white">
          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalPrice)}
        </span>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 text-center">
        Sign in to apply promo codes and proceed to checkout.
      </div>

      <Link
        href="/login"
        className="block w-full text-center py-3.5 rounded-xl font-bold text-base bg-[#FCA311] text-white hover:bg-[#E8920A] transition-colors active:scale-[0.98] shadow-sm"
      >
        Sign in to Checkout →
      </Link>
      <Link
        href="/products"
        className="block text-center text-sm text-[#FCA311] hover:underline font-medium"
      >
        ← Continue Shopping
      </Link>
    </div>
  );
}
