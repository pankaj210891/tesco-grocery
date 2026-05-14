"use client";

import Link from "next/link";
import { Trash2, ShoppingCart } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center text-center py-28">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full p-6 mb-6">
          <ShoppingCart className="h-12 w-12 text-blue-300" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">Sign in to view your cart</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-8">
          Your cart is saved to your account. Sign in to add items and checkout.
        </p>
        <Link href="/login" className="px-8 py-3 bg-[#00539F] text-white font-bold rounded-xl hover:bg-[#003B7A] transition-colors">
          Sign in
        </Link>
      </div>
    );
  }

  if (!loaded || loading) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-28">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-6">
          <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-500" aria-hidden />
        </div>
        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-8">
          Looks like you haven&apos;t added anything yet. Start browsing and fill it up!
        </p>
        <Link href="/products" className="px-8 py-3 bg-[#00539F] text-white font-bold rounded-xl hover:bg-[#003B7A] transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  function handleClearCart() {
    void clearCart(token!);
    toast.success("Cart cleared");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Your Cart</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </p>
        </div>
        <button
          onClick={handleClearCart}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
        >
          <Trash2 className="h-4 w-4" />
          Clear cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <CartItem key={item.product._id} item={item} />
          ))}
        </div>
        <div className="lg:col-span-1">
          <OrderSummary subtotal={totalPrice} />
        </div>
      </div>
    </div>
  );
}
