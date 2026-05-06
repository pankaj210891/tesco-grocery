export interface CategoryMeta {
  name:        string;
  slug:        string;
  emoji:       string;
  description: string;
  color:       string;   // Tailwind bg class
  textColor:   string;   // Tailwind text class
}

export const CATEGORIES: CategoryMeta[] = [
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
    name:        "Dairy & Eggs",
    slug:        "dairy-eggs",
    emoji:       "🥛",
    description: "Milk, butter, cheese, yoghurt and free-range eggs.",
    color:       "bg-blue-50",
    textColor:   "text-blue-700",
  },
  {
    name:        "Meat & Fish",
    slug:        "meat-fish",
    emoji:       "🥩",
    description: "Quality cuts of meat, poultry and sustainably sourced fish.",
    color:       "bg-red-50",
    textColor:   "text-red-700",
  },
  {
    name:        "Frozen Food",
    slug:        "frozen-food",
    emoji:       "🧊",
    description: "Ready meals, ice cream, frozen veg and more.",
    color:       "bg-cyan-50",
    textColor:   "text-cyan-700",
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
    name:        "Snacks",
    slug:        "snacks",
    emoji:       "🍿",
    description: "Crisps, nuts, biscuits, chocolate and confectionery.",
    color:       "bg-orange-50",
    textColor:   "text-orange-700",
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
    name:        "Health & Beauty",
    slug:        "health-beauty",
    emoji:       "🧴",
    description: "Skincare, haircare, vitamins, medicines and personal care.",
    color:       "bg-pink-50",
    textColor:   "text-pink-700",
  },
  {
    name:        "Baby",
    slug:        "baby",
    emoji:       "👶",
    description: "Nappies, baby food, formula, wipes and nursery essentials.",
    color:       "bg-yellow-50",
    textColor:   "text-yellow-700",
  },
];

export function getCategoryMeta(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
