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

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
