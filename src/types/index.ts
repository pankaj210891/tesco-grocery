// ─── Product ────────────────────────────────────────────────────────────────

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  brand: string;
  unit: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: "price-asc" | "price-desc" | "rating" | "newest";
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Category ───────────────────────────────────────────────────────────────

export interface Category {
  _id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
}

// ─── Cart ───────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

// ─── User / Auth ─────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthFormData {
  name?: string;
  email: string;
  password: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface OrderLineItem {
  productId: string;
  name:      string;
  slug:      string;
  price:     number;
  quantity:  number;
  image:     string;
}

export interface Order {
  _id:         string;
  orderNumber: string;
  items:       OrderLineItem[];
  delivery: {
    fullName: string;
    email:    string;
    phone:    string;
    address:  string;
    city:     string;
    postcode: string;
  };
  subtotal:    number;
  deliveryFee: number;
  discount:    number;
  promoCode?:  string;
  total:       number;
  status:      "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt:   string;
}

// ─── Address ─────────────────────────────────────────────────────────────────

export interface Address {
  _id: string;
  userId: string;
  label: "Home" | "Office" | "Other";
  customLabel?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

// ─── Payment Methods ──────────────────────────────────────────────────────────

export type CardType = "visa" | "mastercard" | "amex" | "discover" | "other";

export interface PaymentMethod {
  _id: string;
  userId: string;
  cardType: CardType;
  lastFour: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  isDefault: boolean;
  createdAt: string;
}

// ─── Store Locator ────────────────────────────────────────────────────────────

export interface DayHours {
  open:   string;
  close:  string;
  closed: boolean;
}

export interface Store {
  _id:      string;
  name:     string;
  address:  string;
  city:     string;
  postcode: string;
  phone:    string;
  email?:   string;
  openingHours: {
    monday:    DayHours;
    tuesday:   DayHours;
    wednesday: DayHours;
    thursday:  DayHours;
    friday:    DayHours;
    saturday:  DayHours;
    sunday:    DayHours;
  };
  amenities: string[];
  isActive:  boolean;
  lat?:      number;
  lng?:      number;
  createdAt: string;
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export type FaqCategory = "general" | "account" | "orders" | "delivery" | "payments" | "returns";

export interface Faq {
  _id:      string;
  question: string;
  answer:   string;
  category: FaqCategory;
  order:    number;
  isActive: boolean;
  createdAt: string;
}

// ─── Special Offers ───────────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed" | "freeDelivery";

export interface Offer {
  _id:           string;
  title:         string;
  subtitle?:     string;
  description?:  string;
  code?:         string;
  discountType:  DiscountType;
  discountValue: number;
  minOrderValue: number;
  expiresAt:     string;
  isActive:      boolean;
  badge?:        string;
  color?:        string;
  emoji?:        string;
  category:      string;
  href:          string;
  order:         number;
  createdAt:     string;
}

// ─── Homepage Sections ────────────────────────────────────────────────────────

export type SectionType =
  | "product-carousel"
  | "offer-cards"
  | "brand-inspiration"
  | "info-cards"
  | "category-tiles"
  | "brand-grid"
  | "explore-cards";

export interface SectionItem {
  _id:            string;
  title:          string;
  subtitle?:      string;
  description?:   string;
  emoji?:         string;
  href:           string;
  badge?:         string;
  price?:         number;
  originalPrice?: number;
  discount?:      number;
  brand?:         string;
  color?:         string;
  expiresAt?:     string;
  order:          number;
}

export interface HomepageSection {
  _id:       string;
  key:       string;
  title:     string;
  subtitle?: string;
  type:      SectionType;
  isActive:  boolean;
  order:     number;
  items:     SectionItem[];
  ctaLabel?: string;
  ctaHref?:  string;
  createdAt: string;
  updatedAt: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
