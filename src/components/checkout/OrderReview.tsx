import Image from "next/image";
import { formatPrice } from "@/lib/utils/format";
import type { CartItem } from "@/types";

interface OrderReviewProps {
  items: CartItem[];
}

export default function OrderReview({ items }: OrderReviewProps) {
  return (
    <div>
      <h2 className="text-base font-black text-gray-900 dark:text-white mb-4">
        Your order ({items.reduce((s, i) => s + i.quantity, 0)} items)
      </h2>
      <ul className="space-y-3">
        {items.map(({ product, quantity, selectedVariant, variantId }) => {
          const effectivePrice = selectedVariant?.price != null ? selectedVariant.price : product.price;
          return (
          <li key={`${product._id}-${variantId ?? "base"}`} className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 shrink-0 border border-gray-100 dark:border-gray-600">
              {product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-gray-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                {selectedVariant?.label ?? product.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatPrice(effectivePrice)} × {quantity}
              </p>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">
              {formatPrice(effectivePrice * quantity)}
            </span>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
