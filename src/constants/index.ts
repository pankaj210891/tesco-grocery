export const CATEGORY_SLUGS = [
  "clothing-accessories",
  "marketplace",
  "fresh-food",
  "bakery",
  "frozen-food",
  "treats-snacks",
  "food-cupboard",
  "drinks",
  "baby-toddler",
  "health-beauty",
  "pets",
  "household",
  "home-furniture",
  "electronics-gaming",
  "toys-games",
  "parties-seasonal",
  "sports-leisure",
  "hobbies-stationery",
  "garden-diy-car",
  "kiosk",
  "inspiration-events",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const SORT_OPTIONS = [
  { label: "Relevance",           value: "relevance"   },
  { label: "Price: Low to High",  value: "price-asc"   },
  { label: "Price: High to Low",  value: "price-desc"  },
  { label: "Top Rated",           value: "rating"      },
  { label: "Newest",              value: "newest"      },
  { label: "Most Popular",        value: "popularity"  },
] as const;

export const RATING_OPTIONS = [
  { label: "4 stars", value: 4 },
  { label: "3 stars", value: 3 },
  { label: "2 stars", value: 2 },
  { label: "1 star",  value: 1 },
] as const;

export const DISCOUNT_OPTIONS = [
  { label: "10% off", value: 10 },
  { label: "25% off", value: 25 },
  { label: "50% off", value: 50 },
  { label: "70% off", value: 70 },
] as const;

export const DELIVERY_OPTIONS = [
  { label: "Express Delivery",  value: "express"    },
  { label: "Standard Delivery", value: "standard"   },
  { label: "Click & Collect",   value: "collection" },
] as const;

export const PRODUCTS_PER_PAGE = 12;

export const CATEGORY_NAME_MAP: Record<string, string> = {
  "clothing-accessories": "Clothing & Accessories",
  "marketplace":          "Marketplace",
  "fresh-food":           "Fresh Food",
  "bakery":               "Bakery",
  "frozen-food":          "Frozen Food",
  "treats-snacks":        "Treats & Snacks",
  "food-cupboard":        "Food Cupboard",
  "drinks":               "Drinks",
  "baby-toddler":         "Baby & Toddler",
  "health-beauty":        "Health & Beauty",
  "pets":                 "Pets",
  "household":            "Household",
  "home-furniture":       "Home & Furniture",
  "electronics-gaming":   "Electronics & Gaming",
  "toys-games":           "Toys & Games",
  "parties-seasonal":     "Parties & Seasonal",
  "sports-leisure":       "Sports & Leisure",
  "hobbies-stationery":   "Hobbies & Stationery",
  "garden-diy-car":       "Garden, DIY & Car Care",
  "kiosk":                "Kiosk",
  "inspiration-events":   "Inspiration & Events",
};

/** Prakash Supermarket brand palette — navy + saffron */
export const BRAND_COLORS = {
  primary:      "#0F4C75",
  primaryDark:  "#0A3352",
  primaryLight: "#1B6CA8",
  accent:       "#F57C00",
  accentDark:   "#E65100",
} as const;
