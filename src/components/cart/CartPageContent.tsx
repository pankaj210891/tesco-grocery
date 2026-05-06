"use client";

import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useHydrated } from "@/hooks/useHydrated";
import { useCartStore } from "@/store/cart.store";
import CartItem from "@/components/cart/CartItem";
import OrderSummary from "@/components/cart/OrderSummary";
import EmptyCart from "@/components/cart/EmptyCart";
import CartSkeleton from "@/components/cart/CartSkeleton";

export default function CartPageContent() {
  const hydrated = useHydrated();
  const { items, totalItems, totalPrice, clearCart } = useCartStore();

  if (!hydrated) return <CartSkeleton />;
  if (items.length === 0) return <EmptyCart />;

  function handleClearCart() {
    clearCart();
    toast.success("Cart cleared", { icon: "🗑️" });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Your Cart</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </p>
        </div>
        <button
          onClick={handleClearCart}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
          aria-label="Clear all items from cart"
        >
          <Trash2 className="h-4 w-4" />
          Clear cart
        </button>
      </div>

      {/* Main grid: items (left, 2/3) + summary (right, 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <CartItem key={item.product._id} item={item} />
          ))}
        </div>

        {/* Order summary — stacks below items on mobile */}
        <div className="lg:col-span-1">
          <OrderSummary subtotal={totalPrice} />
        </div>
      </div>
    </div>
  );
}
