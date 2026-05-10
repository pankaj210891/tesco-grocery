import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface Category {
  label: string;
  href:  string;
  emoji: string;
  color: string;
}

const categories: Category[] = [
  { label: "Clothing",          href: "/categories/clothing-accessories", emoji: "👗", color: "bg-rose-50    hover:bg-rose-100    text-rose-700    dark:bg-rose-950    dark:hover:bg-rose-900    dark:text-rose-300"    },
  { label: "Marketplace",       href: "/categories/marketplace",          emoji: "🏪", color: "bg-violet-50  hover:bg-violet-100  text-violet-700  dark:bg-violet-950  dark:hover:bg-violet-900  dark:text-violet-300"  },
  { label: "Fresh Food",        href: "/categories/fresh-food",           emoji: "🥦", color: "bg-green-50   hover:bg-green-100   text-green-700   dark:bg-green-950   dark:hover:bg-green-900   dark:text-green-300"   },
  { label: "Bakery",            href: "/categories/bakery",               emoji: "🍞", color: "bg-amber-50   hover:bg-amber-100   text-amber-700   dark:bg-amber-950   dark:hover:bg-amber-900   dark:text-amber-300"   },
  { label: "Frozen Food",       href: "/categories/frozen-food",          emoji: "🧊", color: "bg-cyan-50    hover:bg-cyan-100    text-cyan-700    dark:bg-cyan-950    dark:hover:bg-cyan-900    dark:text-cyan-300"    },
  { label: "Treats & Snacks",   href: "/categories/treats-snacks",        emoji: "🍿", color: "bg-orange-50  hover:bg-orange-100  text-orange-700  dark:bg-orange-950  dark:hover:bg-orange-900  dark:text-orange-300"  },
  { label: "Food Cupboard",     href: "/categories/food-cupboard",        emoji: "🥫", color: "bg-yellow-50  hover:bg-yellow-100  text-yellow-700  dark:bg-yellow-950  dark:hover:bg-yellow-900  dark:text-yellow-300"  },
  { label: "Drinks",            href: "/categories/drinks",               emoji: "🥤", color: "bg-purple-50  hover:bg-purple-100  text-purple-700  dark:bg-purple-950  dark:hover:bg-purple-900  dark:text-purple-300"  },
  { label: "Baby & Toddler",    href: "/categories/baby-toddler",         emoji: "👶", color: "bg-pink-50    hover:bg-pink-100    text-pink-700    dark:bg-pink-950    dark:hover:bg-pink-900    dark:text-pink-300"    },
  { label: "Health & Beauty",   href: "/categories/health-beauty",        emoji: "🧴", color: "bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:hover:bg-fuchsia-900 dark:text-fuchsia-300" },
  { label: "Pets",              href: "/categories/pets",                 emoji: "🐾", color: "bg-lime-50    hover:bg-lime-100    text-lime-700    dark:bg-lime-950    dark:hover:bg-lime-900    dark:text-lime-300"    },
  { label: "Household",         href: "/categories/household",            emoji: "🧹", color: "bg-gray-50    hover:bg-gray-100    text-gray-700    dark:bg-gray-800    dark:hover:bg-gray-700    dark:text-gray-300"    },
  { label: "Home & Furniture",  href: "/categories/home-furniture",       emoji: "🛋️", color: "bg-stone-50   hover:bg-stone-100   text-stone-700   dark:bg-stone-900   dark:hover:bg-stone-800   dark:text-stone-300"   },
  { label: "Electronics",       href: "/categories/electronics-gaming",   emoji: "🎮", color: "bg-blue-50    hover:bg-blue-100    text-blue-700    dark:bg-blue-950    dark:hover:bg-blue-900    dark:text-blue-300"    },
  { label: "Toys & Games",      href: "/categories/toys-games",           emoji: "🧸", color: "bg-red-50     hover:bg-red-100     text-red-700     dark:bg-red-950     dark:hover:bg-red-900     dark:text-red-300"     },
  { label: "Parties",           href: "/categories/parties-seasonal",     emoji: "🎉", color: "bg-teal-50    hover:bg-teal-100    text-teal-700    dark:bg-teal-950    dark:hover:bg-teal-900    dark:text-teal-300"    },
  { label: "Sports & Leisure",  href: "/categories/sports-leisure",       emoji: "⚽", color: "bg-indigo-50  hover:bg-indigo-100  text-indigo-700  dark:bg-indigo-950  dark:hover:bg-indigo-900  dark:text-indigo-300"  },
  { label: "Hobbies",           href: "/categories/hobbies-stationery",   emoji: "✏️", color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300" },
  { label: "Garden & DIY",      href: "/categories/garden-diy-car",       emoji: "🌿", color: "bg-green-50   hover:bg-green-100   text-green-800   dark:bg-green-950   dark:hover:bg-green-900   dark:text-green-300"   },
  { label: "Kiosk",             href: "/categories/kiosk",                emoji: "🏧", color: "bg-sky-50     hover:bg-sky-100     text-sky-700     dark:bg-sky-950     dark:hover:bg-sky-900     dark:text-sky-300"     },
  { label: "Inspiration",       href: "/categories/inspiration-events",   emoji: "✨", color: "bg-yellow-50  hover:bg-yellow-100  text-yellow-800  dark:bg-yellow-950  dark:hover:bg-yellow-900  dark:text-yellow-300"  },
];

export default function CategoryGrid() {
  return (
    <section aria-labelledby="categories-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="categories-heading"
          className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100"
        >
          Shop by Department
        </h2>
        <Link
          href="/categories"
          className="text-sm font-semibold text-[#0F4C75] dark:text-blue-400 hover:underline"
        >
          All departments →
        </Link>
      </div>

      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3">
        {categories.map((cat) => (
          <li key={cat.href}>
            <Link
              href={cat.href}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150",
                cat.color
              )}
            >
              <span className="text-2xl sm:text-3xl leading-none" aria-hidden>
                {cat.emoji}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight">
                {cat.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
