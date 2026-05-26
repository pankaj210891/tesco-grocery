"use client";

import { memo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlistStore } from "@/store/wishlist.store";
import { useAuthStore } from "@/store/auth.store";
import { savePendingAction } from "@/lib/pending-action";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/types";

interface Props {
  product:    Product;
  className?: string;
}

function WishlistButton({ product, className }: Props) {
  // Granular selectors — re-renders only when this product's saved state or token changes
  const saved      = useWishlistStore(useCallback((s) => s.items.some((i) => i._id === product._id), [product._id]));
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const token      = useAuthStore((s) => s.token);

  const router   = useRouter();
  const pathname = usePathname();

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      savePendingAction({ type: "toggleWishlist", product });
      toast.info("Sign in to save items to your wishlist");
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    const wasSaved = saved;
    await toggleItem(product, token);
    if (wasSaved) {
      toast.success("Removed from wishlist");
    } else {
      toast.success("Saved to wishlist");
    }
  }, [token, saved, toggleItem, product, router, pathname]);

  return (
    <button
      onClick={handleToggle}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      data-testid="wishlist-btn"
      data-saved={saved ? "true" : "false"}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
        saved ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50" : "bg-white/80 hover:bg-white dark:bg-gray-700/80 dark:hover:bg-gray-700",
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

export default memo(WishlistButton);
