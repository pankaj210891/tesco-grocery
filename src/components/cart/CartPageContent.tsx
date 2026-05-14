"use client";

import Link from "next/link";
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import CartItem from "@/components/cart/CartItem";
import OrderSummary from "@/components/cart/OrderSummary";
import CartSkeleton from "@/components/cart/CartSkeleton";

export default function CartPageContent() {
  const { user, token, hasHydrated } = useAuthStore();
  const { items, totalItems, totalPrice, clearCart, loading, loaded } = useCartStore();

  if (!hasHydrated) return <CartSkeleton />;

  if (!user || !token) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-4">
        <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-6">
          <ShoppingCart className="h-9 w-9 text-[#FCA311]" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Sign in to view your cart</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-8 leading-relaxed">
          Your cart is saved to your account. Sign in to continue shopping and checkout.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#FCA311] text-white font-bold rounded-xl hover:bg-[#E8920A] transition-colors"
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (!loaded || loading) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
          <ShoppingCart className="h-9 w-9 text-gray-400 dark:text-gray-500" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
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
      </div>
    );
  }

  function handleClearCart() {
    void clearCart(token!);
    toast.success("Cart cleared");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{totalItems}</span>
            {" "}{totalItems === 1 ? "item" : "items"} in your cart
          </p>
        </div>
        <button
          onClick={handleClearCart}
          className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Clear cart</span>
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Left: Items list */}
        <div className="space-y-3">
          {/* Section header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto] items-center pb-3 border-b border-gray-100 dark:border-gray-700/60">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Product
            </span>
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pr-1">
              Total
            </span>
          </div>

          {items.map((item) => (
            <CartItem key={item.product._id} item={item} />
          ))}

          {/* Continue shopping */}
          <div className="pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm text-[#FCA311] font-semibold hover:underline"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Right: Summary */}
        <div>
          <OrderSummary subtotal={totalPrice} />
        </div>
      </div>
    </div>
  );
}
