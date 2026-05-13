import type { Product } from "@/types";

const KEY = "prakash:pending-action";

export type PendingAction =
  | { type: "addToCart";       product: Product; quantity: number }
  | { type: "toggleWishlist";  product: Product };

export function savePendingAction(action: PendingAction): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(action)); } catch { /* SSR or private mode */ }
}

export function loadPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingAction) : null;
  } catch { return null; }
}

export function clearPendingAction(): void {
  try { sessionStorage.removeItem(KEY); } catch {}
}
