export interface CategoryMeta {
  name:        string;
  slug:        string;
  emoji:       string;
  description: string;
  color:       string;
  textColor:   string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    name:        "Clothing & Accessories",
    slug:        "clothing-accessories",
    emoji:       "👗",
    description: "Fashion for men, women and children — everyday wear, workwear, accessories and more.",
    color:       "bg-rose-50",
    textColor:   "text-rose-700",
  },
  {
    name:        "Marketplace",
    slug:        "marketplace",
    emoji:       "🏪",
    description: "Third-party sellers offering a wide range of products at competitive prices.",
    color:       "bg-violet-50",
    textColor:   "text-violet-700",
  },
  {
    name:        "Fresh Food",
    slug:        "fresh-food",
    emoji:       "🥦",
    description: "Seasonal fruits, vegetables and salads, freshly sourced from local farms.",
    color:       "bg-green-50",
    textColor:   "text-green-700",
  },
  {
    name:        "Bakery",
    slug:        "bakery",
    emoji:       "🍞",
    description: "Artisan breads, pastries and cakes baked fresh every morning.",
    color:       "bg-amber-50",
    textColor:   "text-amber-700",
  },
  {
    name:        "Frozen Food",
    slug:        "frozen-food",
    emoji:       "🧊",
    description: "Ready meals, ice cream, frozen veg, fish and meat.",
    color:       "bg-cyan-50",
    textColor:   "text-cyan-700",
  },
  {
    name:        "Treats & Snacks",
    slug:        "treats-snacks",
    emoji:       "🍿",
    description: "Crisps, nuts, biscuits, chocolate, confectionery and sweet treats.",
    color:       "bg-orange-50",
    textColor:   "text-orange-700",
  },
  {
    name:        "Food Cupboard",
    slug:        "food-cupboard",
    emoji:       "🥫",
    description: "Tinned goods, pasta, rice, sauces, oils, condiments and baking essentials.",
    color:       "bg-yellow-50",
    textColor:   "text-yellow-700",
  },
  {
    name:        "Drinks",
    slug:        "drinks",
    emoji:       "🥤",
    description: "Soft drinks, juices, water, coffee, tea and alcoholic beverages.",
    color:       "bg-purple-50",
    textColor:   "text-purple-700",
  },
  {
    name:        "Baby & Toddler",
    slug:        "baby-toddler",
    emoji:       "👶",
    description: "Nappies, baby food, formula, wipes, toys and nursery essentials.",
    color:       "bg-pink-50",
    textColor:   "text-pink-700",
  },
  {
    name:        "Health & Beauty",
    slug:        "health-beauty",
    emoji:       "🧴",
    description: "Skincare, haircare, vitamins, medicines and personal care products.",
    color:       "bg-fuchsia-50",
    textColor:   "text-fuchsia-700",
  },
  {
    name:        "Pets",
    slug:        "pets",
    emoji:       "🐾",
    description: "Food, treats, toys, accessories and healthcare products for all pets.",
    color:       "bg-lime-50",
    textColor:   "text-lime-700",
  },
  {
    name:        "Household",
    slug:        "household",
    emoji:       "🧹",
    description: "Cleaning products, laundry, kitchen essentials and paper goods.",
    color:       "bg-gray-50",
    textColor:   "text-gray-700",
  },
  {
    name:        "Home & Furniture",
    slug:        "home-furniture",
    emoji:       "🛋️",
    description: "Furniture, bedding, kitchenware, décor and home improvement essentials.",
    color:       "bg-stone-50",
    textColor:   "text-stone-700",
  },
  {
    name:        "Electronics & Gaming",
    slug:        "electronics-gaming",
    emoji:       "🎮",
    description: "TVs, laptops, phones, gaming consoles, accessories and smart home devices.",
    color:       "bg-blue-50",
    textColor:   "text-blue-700",
  },
  {
    name:        "Toys & Games",
    slug:        "toys-games",
    emoji:       "🧸",
    description: "Toys, board games, puzzles and outdoor play for all ages.",
    color:       "bg-red-50",
    textColor:   "text-red-700",
  },
  {
    name:        "Parties & Seasonal",
    slug:        "parties-seasonal",
    emoji:       "🎉",
    description: "Party supplies, seasonal decorations, gifting and celebration essentials.",
    color:       "bg-teal-50",
    textColor:   "text-teal-700",
  },
  {
    name:        "Sports & Leisure",
    slug:        "sports-leisure",
    emoji:       "⚽",
    description: "Fitness equipment, sportswear, outdoor gear and leisure accessories.",
    color:       "bg-indigo-50",
    textColor:   "text-indigo-700",
  },
  {
    name:        "Hobbies & Stationery",
    slug:        "hobbies-stationery",
    emoji:       "✏️",
    description: "Art supplies, craft materials, stationery and hobby kits.",
    color:       "bg-emerald-50",
    textColor:   "text-emerald-700",
  },
  {
    name:        "Garden, DIY & Car Care",
    slug:        "garden-diy-car",
    emoji:       "🌿",
    description: "Plants, garden tools, DIY supplies, car accessories and maintenance products.",
    color:       "bg-green-50",
    textColor:   "text-green-800",
  },
  {
    name:        "Kiosk",
    slug:        "kiosk",
    emoji:       "🏧",
    description: "Gift cards, vouchers, phone top-ups, travel and financial services.",
    color:       "bg-sky-50",
    textColor:   "text-sky-700",
  },
  {
    name:        "Inspiration & Events",
    slug:        "inspiration-events",
    emoji:       "✨",
    description: "Curated collections, seasonal inspiration, recipes and lifestyle guides.",
    color:       "bg-yellow-50",
    textColor:   "text-yellow-800",
  },
];

export function getCategoryMeta(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
