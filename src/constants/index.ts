export const CATEGORY_SLUGS = [
  "fresh-food",
  "bakery",
  "dairy-eggs",
  "meat-fish",
  "frozen-food",
  "drinks",
  "snacks",
  "household",
  "health-beauty",
  "baby",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const SORT_OPTIONS = [
  { label: "Relevance", value: "relevance" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Top Rated", value: "rating" },
  { label: "Newest", value: "newest" },
] as const;

export const PRODUCTS_PER_PAGE = 12;

export const TESCO_COLORS = {
  blue: "#00539F",
  red: "#EE1C2E",
  lightBlue: "#007DC6",
  darkBlue: "#003B7A",
} as const;
