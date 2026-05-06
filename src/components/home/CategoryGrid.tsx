import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface Category {
  label: string;
  href: string;
  emoji: string;
  color: string;
}

const categories: Category[] = [
  { label: "Fresh Food",    href: "/categories/fresh-food",   emoji: "🥦", color: "bg-green-50 hover:bg-green-100 text-green-700" },
  { label: "Bakery",        href: "/categories/bakery",        emoji: "🍞", color: "bg-amber-50 hover:bg-amber-100 text-amber-700" },
  { label: "Dairy & Eggs",  href: "/categories/dairy-eggs",    emoji: "🥛", color: "bg-blue-50 hover:bg-blue-100 text-blue-700"   },
  { label: "Meat & Fish",   href: "/categories/meat-fish",     emoji: "🥩", color: "bg-red-50 hover:bg-red-100 text-red-700"     },
  { label: "Frozen Food",   href: "/categories/frozen-food",   emoji: "🧊", color: "bg-cyan-50 hover:bg-cyan-100 text-cyan-700"   },
  { label: "Drinks",        href: "/categories/drinks",        emoji: "🥤", color: "bg-purple-50 hover:bg-purple-100 text-purple-700" },
  { label: "Snacks",        href: "/categories/snacks",        emoji: "🍿", color: "bg-orange-50 hover:bg-orange-100 text-orange-700" },
  { label: "Household",     href: "/categories/household",     emoji: "🧹", color: "bg-gray-50 hover:bg-gray-100 text-gray-700"   },
];

export default function CategoryGrid() {
  return (
    <section aria-labelledby="categories-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="categories-heading"
          className="text-xl sm:text-2xl font-black text-gray-900"
        >
          Shop by Category
        </h2>
        <Link
          href="/products"
          className="text-sm font-semibold text-[#00539F] hover:underline"
        >
          View all →
        </Link>
      </div>

      <ul className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {categories.map((cat) => (
          <li key={cat.href}>
            <Link
              href={cat.href}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                cat.color
              )}
            >
              <span className="text-3xl sm:text-4xl leading-none" aria-hidden>
                {cat.emoji}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight">
                {cat.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
