import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { loadPendingAction, clearPendingAction } from "@/lib/pending-action";
import { toast } from "sonner";

/**
 * Executes any action the user tried to take before being redirected to
 * the login/register page (add to cart, toggle wishlist).
 * Call this immediately after setAuth() succeeds.
 */
export function usePendingAction() {
  const addItem    = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);

  return async function executePendingAction(token: string): Promise<void> {
    const action = loadPendingAction();
    if (!action) return;
    clearPendingAction();

    if (action.type === "addToCart") {
      await addItem(action.product, action.quantity, token);
      toast.success(`${action.product.name} added to cart`);
    } else if (action.type === "toggleWishlist") {
      await toggleItem(action.product, token);
      toast.success("Saved to wishlist");
    }
  };
}
