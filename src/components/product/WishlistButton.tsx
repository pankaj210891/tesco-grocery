"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlistStore } from "@/store/wishlist.store";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/types";

interface Props {
  product:    Product;
  className?: string;
}

export default function WishlistButton({ product, className }: Props) {
  const { toggleItem, hasItem } = useWishlistStore();
  const { token } = useAuthStore();
  const router = useRouter();
  const saved = hasItem(product._id);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast.error("Sign in to save items to your wishlist");
      router.push("/login");
      return;
    }
    const wasSaved = saved;
    await toggleItem(product, token);
    if (wasSaved) {
      toast.success(`Removed from wishlist`);
    } else {
      toast.success(`Saved to wishlist`);
    }
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
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
