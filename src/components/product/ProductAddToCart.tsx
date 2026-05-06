"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Minus, Plus, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";
import type { Product } from "@/types";

interface ProductAddToCartProps {
  product: Product;
}

export default function ProductAddToCart({ product }: ProductAddToCartProps) {
  const [qty, setQty] = useState(1);
  const { addItem, items } = useCartStore();

  const cartItem = items.find((i) => i.product._id === product._id);
  const cartQty = cartItem?.quantity ?? 0;

  function decrement() {
    setQty((q) => Math.max(1, q - 1));
  }

  function increment() {
    setQty((q) => q + 1);
  }

  function handleAdd() {
    addItem(product, qty);
    toast.success(
      <span>
        <strong>{product.name}</strong> × {qty} added to cart
      </span>,
      { duration: 2500 }
    );
  }

  return (
    <div className="space-y-4">
      {/* Already in cart indicator */}
      {cartQty > 0 && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {cartQty} already in your cart
          </div>
          <Link
            href="/cart"
            className="text-sm font-semibold text-[#00539F] hover:underline"
          >
            View Cart →
          </Link>
        </div>
      )}

      {/* Quantity selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">Qty:</span>
        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
          <button
            onClick={decrement}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-5 py-2.5 text-base font-bold tabular-nums min-w-[3.5rem] text-center border-x border-gray-300">
            {qty}
          </span>
          <button
            onClick={increment}
            aria-label="Increase quantity"
            className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add to Cart button */}
      <button
        onClick={handleAdd}
        disabled={!product.inStock}
        className={cn(
          "w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl",
          "text-base font-bold transition-all active:scale-[0.98]",
          product.inStock
            ? "bg-[#00539F] text-white hover:bg-[#003B7A] shadow-sm hover:shadow"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        )}
      >
        <ShoppingCart className="h-5 w-5" />
        {product.inStock ? "Add to Cart" : "Out of Stock"}
      </button>

      {/* Delivery note */}
      {product.inStock && (
        <p className="text-xs text-gray-500 text-center">
          Free delivery on orders over <strong>£40</strong>
        </p>
      )}
    </div>
  );
}
