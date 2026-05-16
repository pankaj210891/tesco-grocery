"use client";

import { useEffect, useReducer, useRef, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { formatPrice } from "@/lib/utils/format";
import type { CartRecommendation } from "@/types";

interface Props {
  cartItemIds:   string[];
  cartCategories: string[];
}

function RecommendationCard({ item }: { item: CartRecommendation }) {
  const addItem = useCartStore((s) => s.addItem);
  const token   = useAuthStore((s) => s.token) ?? null;

  const discount = item.originalPrice && item.originalPrice > item.price
    ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
    : null;

  async function handleAdd() {
    await addItem(
      {
        _id: item._id, name: item.name, slug: item.slug, price: item.price,
        originalPrice: item.originalPrice, images: item.images, brand: item.brand,
        unit: item.unit, inStock: item.inStock, rating: item.rating,
        reviewCount: 0, tags: [], badge: item.badge ?? null,
        vendorName: item.vendorName ?? null, vendorId: null,
        category: "", description: "", createdAt: "", updatedAt: "",
      },
      1,
      token
    );
    toast.success(`${item.name} added to cart`);
  }

  return (
    <article className="shrink-0 w-40 sm:w-44 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md hover:border-[#FCA311]/30 transition-all group">
      <Link href={`/products/${item.slug}`} className="block relative aspect-square bg-gray-50 dark:bg-gray-700/50">
        <Image
          src={item.images[0] ?? "/images/placeholder-product.webp"}
          alt={item.name}
          fill
          sizes="176px"
          className="object-contain p-3 group-hover:scale-105 transition-transform duration-200"
        />
        {discount && (
          <span className="absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 bg-red-500 text-white rounded-md leading-none">
            {discount}% off
          </span>
        )}
        {item.badge && (
          <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 bg-[#FCA311] text-white rounded-md leading-none">
            {item.badge}
          </span>
        )}
      </Link>

      <div className="p-2.5 space-y-1.5">
        <Link href={`/products/${item.slug}`} className="block">
          <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug hover:text-[#FCA311] transition-colors">
            {item.name}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{item.brand} · {item.unit}</p>
        </Link>

        {item.rating > 0 && (
          <div className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-[#FCA311] text-[#FCA311]" />
            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{item.rating.toFixed(1)}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          <div>
            <p className="text-sm font-black text-gray-900 dark:text-white">{formatPrice(item.price)}</p>
            {item.originalPrice && item.originalPrice > item.price && (
              <p className="text-[10px] text-gray-400 line-through">{formatPrice(item.originalPrice)}</p>
            )}
          </div>
          <button
            onClick={() => void handleAdd()}
            disabled={!item.inStock}
            aria-label={`Add ${item.name} to cart`}
            className="p-1.5 rounded-lg bg-[#FCA311] hover:bg-[#E8920A] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

const MemoCard = memo(RecommendationCard);

type State = { items: CartRecommendation[]; loading: boolean };
type Action =
  | { type: "done"; items: CartRecommendation[] }
  | { type: "error" };

function reducer(_: State, action: Action): State {
  if (action.type === "done")  return { items: action.items, loading: false };
  return { items: [], loading: false };
}

export default function CartRecommendations({ cartItemIds, cartCategories }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    items:   [],
    loading: cartCategories.length > 0,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stable string keys derived from props
  const excludeKey  = cartItemIds.join(",");
  const categoryKey = cartCategories.join(",");

  useEffect(() => {
    if (!categoryKey) return;
    let cancelled = false;

    const params = new URLSearchParams({
      excludeIds: excludeKey,
      categories: categoryKey,
      limit:      "8",
    });

    fetch(`/api/account/cart/recommendations?${params.toString()}`)
      .then((r) => r.json())
      .then((json: { success: boolean; data: CartRecommendation[] }) => {
        if (!cancelled) dispatch({ type: "done", items: json.success ? json.data : [] });
      })
      .catch(() => { if (!cancelled) dispatch({ type: "error" }); });

    return () => { cancelled = true; };
  }, [excludeKey, categoryKey]);

  const { items, loading } = state;

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  }

  if (loading) {
    return (
      <section className="mt-8">
        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-40 h-56 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section data-testid="cart-recommendations" className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          You might also like
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-[#FCA311] hover:border-[#FCA311]/40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-[#FCA311] hover:border-[#FCA311]/40 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map((item) => (
          <div key={item._id} style={{ scrollSnapAlign: "start" }}>
            <MemoCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
