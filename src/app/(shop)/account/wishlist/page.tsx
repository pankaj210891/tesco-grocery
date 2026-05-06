"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist.store";
import { useCartStore } from "@/store/cart.store";
import { useHydrated } from "@/hooks/useHydrated";
import WishlistButton from "@/components/product/WishlistButton";
import Image from "next/image";
import { formatPrice } from "@/lib/utils/format";
import type { Product } from "@/types";

function WishlistItem({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <li className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
      {/* Image */}
      <Link href={`/products/${product.slug}`} className="shrink-0">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
          <Image
            src={product.images[0] ?? "/images/placeholder-product.png"}
            alt={product.name}
            fill
            sizes="80px"
            className="object-contain p-1"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">
          {product.category}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-semibold text-gray-900 hover:text-[#00539F] transition-colors line-clamp-2"
        >
          {product.name}
        </Link>
        <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
        <p className="text-base font-black text-gray-900 mt-1">{formatPrice(product.price)}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <WishlistButton product={product} />
        <button
          onClick={() => addItem(product)}
          disabled={!product.inStock}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00539F] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-lg hover:bg-[#003B7A] transition-colors"
        >
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
          {product.inStock ? "Add to cart" : "Out of stock"}
        </button>
      </div>
    </li>
  );
}

export default function WishlistPage() {
  const hydrated = useHydrated();
  const items    = useWishlistStore((s) => s.items);

  if (!hydrated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" aria-hidden />
        <h1 className="text-2xl font-black text-gray-900">
          Wishlist
          {items.length > 0 && (
            <span className="ml-2 text-base font-semibold text-gray-400">
              ({items.length} {items.length === 1 ? "item" : "items"})
            </span>
          )}
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex bg-red-50 rounded-full p-5 mb-5">
            <Heart className="h-10 w-10 text-red-300" aria-hidden />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Your wishlist is empty</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tap the heart icon on any product to save it here.
          </p>
          <Link
            href="/products"
            className="px-6 py-2.5 bg-[#00539F] text-white font-semibold rounded-xl text-sm hover:bg-[#003B7A] transition-colors"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((product) => (
            <WishlistItem key={product._id} product={product} />
          ))}
        </ul>
      )}
    </div>
  );
}
