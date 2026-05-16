"use client";

import { useState, useCallback, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, ShoppingCart, Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { formatPrice } from "@/lib/utils/format";
import type { SavedCartItem } from "@/types";

// ── Per-item card ─────────────────────────────────────────────────────────────

interface SavedItemCardProps {
  savedItem: SavedCartItem;
  onMoveToCart: (productId: string, name: string) => void;
  onRemove: (productId: string, name: string) => void;
  loadingId: string | null;
}

const SavedItemCard = memo(function SavedItemCard({
  savedItem: { product },
  onMoveToCart,
  onRemove,
  loadingId,
}: SavedItemCardProps) {
  const isLoading = loadingId === product._id;
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <article
      data-testid="saved-item"
      className="flex gap-3 bg-white dark:bg-gray-800/80 rounded-xl border border-dashed border-gray-200 dark:border-gray-600/60 p-3 hover:border-[#FCA311]/40 transition-all duration-200"
    >
      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className="shrink-0 relative rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50"
        style={{ width: 72, height: 72 }}
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={product.images[0] ?? "/images/placeholder-product.webp"}
          alt={product.name}
          fill
          sizes="72px"
          className="object-contain p-1.5"
        />
        {discount && (
          <span className="absolute top-1 left-1 text-[9px] font-black px-1 py-0.5 bg-red-500 text-white rounded leading-none">
            {discount}%
          </span>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center">
            <span className="text-[8px] font-black text-red-600 uppercase tracking-wide text-center px-1 leading-tight">
              Out of stock
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-medium text-gray-900 dark:text-white hover:text-[#FCA311] transition-colors line-clamp-1"
        >
          {product.name}
        </Link>
        {product.brand && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{product.brand}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {!product.inStock && (
          <p className="text-[10px] font-semibold text-red-500 mt-1">Out of stock</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end justify-between gap-1 shrink-0">
        <button
          onClick={() => onRemove(product._id, product.name)}
          disabled={isLoading}
          aria-label={`Remove ${product.name} from saved`}
          data-testid="remove-saved"
          className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMoveToCart(product._id, product.name)}
          disabled={!product.inStock || isLoading}
          aria-label={`Move ${product.name} to cart`}
          data-testid="move-to-cart"
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#FCA311] hover:bg-[#E8920A] disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {isLoading ? (
            <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
          ) : (
            <ShoppingCart className="h-3 w-3" />
          )}
          <span>{isLoading ? "Moving…" : "Move to cart"}</span>
        </button>
      </div>
    </article>
  );
});

// ── Skeleton shown while first fetch is in flight ─────────────────────────────

function SavedSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-dashed border-gray-100 dark:border-gray-700 p-3"
        >
          <div className="h-[72px] w-[72px] bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function SavedEmptyState() {
  return (
    <div
      data-testid="saved-items-empty"
      className="flex flex-col items-center justify-center text-center py-8 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
    >
      <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3">
        <Package className="h-6 w-6 text-[#FCA311]/70" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        No saved products yet
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
        Tap{" "}
        <Bookmark className="inline h-3 w-3 mx-0.5 text-[#FCA311]" />{" "}
        <strong>Save</strong> on any trolley item to keep it here for later.
      </p>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function SavedItemsSection() {
  const savedItems  = useCartStore((s) => s.savedItems);
  const savedLoaded = useCartStore((s) => s.savedLoaded);
  const moveToCart   = useCartStore((s) => s.moveToCart);
  const removeSaved  = useCartStore((s) => s.removeSaved);
  const token        = useAuthStore((s) => s.token) ?? "";

  const [collapsed, setCollapsed] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleMoveToCart = useCallback(
    async (productId: string, name: string) => {
      setLoadingId(productId);
      try {
        await moveToCart(productId, token);
        toast.success(`${name} moved to trolley`);
      } finally {
        setLoadingId(null);
      }
    },
    [moveToCart, token]
  );

  const handleRemoveSaved = useCallback(
    async (productId: string, name: string) => {
      setLoadingId(productId);
      try {
        await removeSaved(productId, token);
        toast.success(`${name} removed`);
      } finally {
        setLoadingId(null);
      }
    },
    [removeSaved, token]
  );

  return (
    <section data-testid="saved-items-section" className="mt-8">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between w-full mb-4 group"
        aria-expanded={!collapsed}
        aria-controls="saved-items-list"
        data-testid="saved-items-toggle"
      >
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-[#FCA311]" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Saved for Later
          </h2>
          <span
            className={`text-xs font-semibold text-white rounded-full px-2 py-0.5 transition-colors ${
              savedItems.length > 0
                ? "bg-[#FCA311]"
                : "bg-gray-400 dark:bg-gray-600"
            }`}
          >
            {savedItems.length}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-400 transition-transform duration-200" />
        )}
      </button>

      {!collapsed && (
        <div id="saved-items-list">
          {!savedLoaded ? (
            <SavedSkeleton />
          ) : savedItems.length === 0 ? (
            <SavedEmptyState />
          ) : (
            <div className="space-y-3">
              {savedItems.map((savedItem) => (
                <SavedItemCard
                  key={savedItem.product._id}
                  savedItem={savedItem}
                  onMoveToCart={handleMoveToCart}
                  onRemove={handleRemoveSaved}
                  loadingId={loadingId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
