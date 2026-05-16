// ─── Product ────────────────────────────────────────────────────────────────

export type ProductBadge  = "NEW" | "HOT" | "LIMITED" | "ORGANIC" | "EXCLUSIVE";
export type ProductStatus = "pending" | "approved" | "rejected";
export type DeliveryOption = "express" | "standard" | "collection";
export type SortBy = "price-asc" | "price-desc" | "rating" | "newest" | "popularity";

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  subcategory?: string | null;
  brand: string;
  unit: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  badge?: ProductBadge | null;
  deliveryOptions?: DeliveryOption[];
  vendorId?: string | null;
  vendorName?: string | null;
  status?: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?:       string;
  subcategory?:    string;
  brands?:         string[];   // multi-select, replaces single brand
  minPrice?:       number;
  maxPrice?:       number;
  inStock?:        boolean;
  rating?:          number;          // exact star rating match (e.g. 4 = exactly 4 stars)
  discount?:        number;          // exact discount % match (e.g. 25 = exactly 25% off)
  deliveryOptions?: DeliveryOption[]; // multi-select delivery types
  sortBy?:         SortBy;
  search?:         string;
  page?:           number;
  limit?:          number;
  slugs?:          string[];
}

export interface FilterMeta {
  brands:        string[];
  subcategories: string[];
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Category ───────────────────────────────────────────────────────────────

export interface Category {
  _id:          string;
  name:         string;
  slug:         string;
  emoji:        string;
  image:        string;
  description:  string;
  color:        string;
  textColor:    string;
  order:        number;
  isActive:     boolean;
  productCount: number;
  createdAt:    string;
}

// Lightweight shape returned by the categories list API
export interface CategorySummary {
  name:  string;
  slug:  string;
  count: number;
}

// Extended seed shape used by the seed system
export interface Department {
  _id:   string;
  name:  string;
  slug:  string;
  emoji: string;
  categories: string[];   // category slugs
}

export interface SeedResult {
  collection: string;
  inserted:   number;
  deleted:    number;
  durationMs: number;
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

export type UserRole = "customer" | "vendor" | "admin";
export type UserStatus = "active" | "suspended";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface AuthFormData {
  name?: string;
  email: string;
  password: string;
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export type VendorStatus = "pending" | "active" | "suspended";

export interface Vendor {
  _id:         string;
  name:        string;
  slug:        string;
  description: string;
  logo:        string;
  email:       string;
  phone:       string;
  address:     string;
  city:        string;
  status:      VendorStatus;
  ownerId:     string;
  ownerName:   string;
  createdAt:   string;
}

export type VendorInviteStatus = "pending" | "accepted" | "expired";

export interface VendorInvite {
  _id:          string;
  email:        string;
  businessName: string;
  contactName:  string;
  status:       VendorInviteStatus;
  expiresAt:    string;
  invitedBy:    string;
  createdAt:    string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface OrderLineItem {
  productId:  string;
  vendorId?:  string | null;
  vendorName?: string | null;
  name:       string;
  slug:       string;
  price:      number;
  quantity:   number;
  image:      string;
}

export type PaymentMethodType = "razorpay" | "cod";
export type PaymentStatus    = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type RefundStatus     = "initiated" | "processed" | "failed";
export type RefundType       = "full" | "partial";

export interface RefundItem {
  productId: string;
  name:      string;
  quantity:  number;
  amount:    number;
}

export interface Order {
  _id:         string;
  orderNumber: string;
  userId?:     string | null;
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
  codCharge:   number;
  discount:    number;
  promoCode?:  string;
  total:       number;
  status:         "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentMethod:  PaymentMethodType;
  paymentStatus:  PaymentStatus;
  razorpayOrderId?:   string;
  razorpayPaymentId?: string;
  cancellationReason?:  string;
  cancellationComment?: string;
  refundId?:          string;
  refundStatus?:      RefundStatus;
  refundType?:        RefundType | null;
  refundReason?:      string | null;
  refundedAmount?:    number;
  refundedItems?:     RefundItem[];
  refundProcessedAt?: string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface OrderDetail extends Order {
  user?: {
    _id:    string;
    name:   string;
    email:  string;
    role:   string;
    status: string;
  } | null;
}

export interface UserAnalytics {
  totalOrders:     number;
  totalSpent:      number;
  cancelledOrders: number;
  refundedOrders:  number;
  lastOrderDate:   string | null;
}

export interface UserDetail extends User {
  addresses: Address[];
  orders:    Order[];
  analytics: UserAnalytics;
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

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  _id:          string;
  productId:    string;
  productSlug:  string;
  userId:       string;
  userName:     string;
  rating:       number;
  title:        string;
  body:         string;
  isApproved:   boolean;
  helpfulCount: number;
  createdAt:    string;
}

export interface RatingSummary {
  average:      number;
  total:        number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
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
  _id:                 string;
  title:               string;
  subtitle?:           string;
  description?:        string;
  code?:               string;
  discountType:        DiscountType;
  discountValue:       number;
  minOrderValue:       number;
  expiresAt:           string;
  isActive:            boolean;
  eligibleCategories:  string[]; // [] = all categories
  badge?:              string;
  color?:              string;
  emoji?:              string;
  category:            string;
  href:                string;
  order:               number;
  createdAt:           string;
}

// ─── Homepage Sections ────────────────────────────────────────────────────────

export type SectionType =
  | "product-carousel"
  | "offer-cards"
  | "brand-inspiration"
  | "info-cards"
  | "category-tiles"
  | "brand-grid"
  | "explore-cards"
  | "hero-banner";

export interface SectionItem {
  _id:            string;
  title:          string;
  subtitle?:      string;
  description?:   string;
  emoji?:         string;
  href:           string;
  productSlug?:   string;
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

// ─── Marketplace Analytics ────────────────────────────────────────────────────

export interface VendorAnalytics {
  totalRevenue:   number;
  totalOrders:    number;
  pendingOrders:  number;
  totalProducts:  number;
  topProducts: Array<{
    name:     string;
    slug:     string;
    revenue:  number;
    quantity: number;
  }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
}

export interface AdminVendorStats {
  vendorId:      string;
  vendorName:    string;
  totalProducts: number;
  totalOrders:   number;
  totalRevenue:  number;
  status:        string;
}

export interface AdminDashboardStats {
  totalProducts:    number;
  totalOrders:      number;
  pendingOrders:    number;
  processingOrders: number;
  totalUsers:       number;
  totalVendors:     number;
  totalRevenue:     number;
  recentOrders: Array<{
    _id:          string;
    orderNumber:  string;
    delivery:     { fullName: string };
    total:        number;
    status:       string;
    createdAt:    string;
  }>;
  lowStock:    Array<{ _id: string; name: string; category: string }>;
  topVendors:  AdminVendorStats[];
}

// ─── Paginated results ────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  totalPages: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
