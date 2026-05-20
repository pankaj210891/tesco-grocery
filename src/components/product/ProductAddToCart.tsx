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
import WishlistButton from "./WishlistButton";
import type { Product, ProductVariant } from "@/types";

const AMBER = "#FCA311";
const AMBER_DARK = "#E8920A";

interface ProductAddToCartProps {
  product:         Product;
  selectedVariant?: ProductVariant | null;
}

export default function ProductAddToCart({ product, selectedVariant }: ProductAddToCartProps) {
  const [qty, setQty] = useState(1);
  const { addItem, items } = useCartStore();
  const { token } = useAuthStore();
  const router    = useRouter();
  const pathname  = usePathname();

  // Show quantity for this specific variant slot, not the whole product
  const variantId = selectedVariant?._id ?? null;
  const cartItem  = items.find(
    (i) => i.product._id === product._id && (i.variantId ?? null) === variantId
  );
  const cartQty = cartItem?.quantity ?? 0;

  const isInStock = selectedVariant != null ? selectedVariant.inStock : product.inStock;

  function handleAdd() {
    if (!token) {
      savePendingAction({ type: "addToCart", product, quantity: qty });
      toast.info("Sign in to add items to your cart");
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    void addItem(product, qty, token, selectedVariant);
    const label = selectedVariant ? `${product.name} (${selectedVariant.label})` : product.name;
    toast.success(`${label} × ${qty} added to cart`);
  }

  return (
    <div className="space-y-4">
      {/* Already-in-cart indicator for this specific variant */}
      {cartQty > 0 && (
        <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {cartQty} {cartQty === 1 ? "unit" : "units"} in your cart
            {selectedVariant && (
              <span className="text-green-600 dark:text-green-500 font-normal">
                · {selectedVariant.label}
              </span>
            )}
          </div>
          <Link href="/cart" className="text-sm font-bold text-[#FCA311] hover:underline">
            View Cart →
          </Link>
        </div>
      )}

      {/* Quantity selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Quantity</span>
        <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden h-11">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="w-11 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-r border-gray-200 dark:border-gray-600"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-14 h-full flex items-center justify-center text-base font-black tabular-nums text-gray-900 dark:text-white select-none bg-white dark:bg-gray-800">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
            className="w-11 h-full flex items-center justify-center transition-colors border-l border-gray-200 dark:border-gray-600 text-white"
            style={{ backgroundColor: AMBER }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER_DARK; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = AMBER; }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CTA row: Add to cart + Wishlist */}
      <div className="flex gap-3">
        <button
          onClick={handleAdd}
          disabled={!isInStock}
          className={cn(
            "flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl",
            "text-base font-bold transition-colors transition-shadow transition-transform duration-200 active:scale-[0.98]",
            isInStock
              ? "bg-[#FCA311] text-white hover:bg-[#E8920A] shadow-sm hover:shadow-md"
              : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed",
          )}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {isInStock ? (token ? "Add to Cart" : "Sign in to Add") : "Out of Stock"}
        </button>

        <WishlistButton
          product={product}
          className="w-12 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-red-300 dark:hover:border-red-700"
        />
      </div>

      {isInStock && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Free delivery on orders over <strong className="text-gray-600 dark:text-gray-300">₹500</strong>
        </p>
      )}
    </div>
  );
}
