import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export default function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-28">
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <ShoppingCart className="h-12 w-12 text-gray-400" aria-hidden />
      </div>
      <h2 className="text-xl font-black text-gray-800 mb-2">
        Your cart is empty
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mb-8">
        Looks like you haven&apos;t added anything yet. Start browsing and fill
        it up!
      </p>
      <Link
        href="/products"
        className="px-8 py-3 bg-[#FCA311] text-white font-bold rounded-xl hover:bg-[#E8920A] transition-colors"
      >
        Browse Products
      </Link>
    </div>
  );
}
