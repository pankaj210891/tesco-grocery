"use client";

import { Heart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist.store";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/types";

interface Props {
  product:    Product;
  className?: string;
}

export default function WishlistButton({ product, className }: Props) {
  const hydrated             = useHydrated();
  const { toggleItem, hasItem } = useWishlistStore();
  const token                = useAuthStore((s) => s.token);
  const saved                = hydrated && hasItem(product._id);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const willBeSaved = !hasItem(product._id);
    toggleItem(product); // instant local update

    if (!token) return; // not logged in — localStorage only

    // fire-and-forget server sync
    try {
      if (willBeSaved) {
        await fetch("/api/account/wishlist", {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ productId: product._id }),
        });
      } else {
        await fetch(`/api/account/wishlist/${product._id}`, {
          method:  "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // silently ignore — local state is already correct
    }
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
        saved ? "bg-red-50 hover:bg-red-100" : "bg-white/80 hover:bg-white",
        className
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          saved ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"
        )}
      />
    </button>
  );
}
