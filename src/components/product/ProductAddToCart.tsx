"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, Minus, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { savePendingAction } from "@/lib/pending-action";
import type { Product } from "@/types";

interface ProductAddToCartProps {
  product: Product;
}

export default function ProductAddToCart({ product }: ProductAddToCartProps) {
  const [qty, setQty] = useState(1);
  const { addItem, items } = useCartStore();
  const { token } = useAuthStore();
  const router    = useRouter();
  const pathname  = usePathname();

  const cartItem = items.find((i) => i.product._id === product._id);
  const cartQty  = cartItem?.quantity ?? 0;

  function handleAdd() {
    if (!token) {
      savePendingAction({ type: "addToCart", product, quantity: qty });
      toast.info("Sign in to add items to your cart");
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    void addItem(product, qty, token);
    toast.success(`${product.name} × ${qty} added to cart`);
  }

  return (
    <div className="space-y-4">
      {cartQty > 0 && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {cartQty} already in your cart
          </div>
          <Link href="/cart" className="text-sm font-semibold text-[#00539F] hover:underline">
            View Cart →
          </Link>
        </div>
      )}

      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">Qty:</span>
        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
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
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
            className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

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
        {product.inStock ? (token ? "Add to Cart" : "Sign in to Add") : "Out of Stock"}
      </button>

      {product.inStock && (
        <p className="text-xs text-gray-500 text-center">
          Free delivery on orders over <strong>£40</strong>
        </p>
      )}
    </div>
  );
}
