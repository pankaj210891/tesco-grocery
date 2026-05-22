// ─── Product ────────────────────────────────────────────────────────────────

export type ProductBadge  = "NEW" | "HOT" | "LIMITED" | "ORGANIC" | "EXCLUSIVE" | "SALE";
export type ProductStatus = "pending" | "approved" | "rejected";
export type DeliveryOption = "express" | "standard" | "collection";
export type SortBy = "price-asc" | "price-desc" | "rating" | "newest" | "popularity";

export interface ProductVariant {
  _id:           string;
  label:         string;
  sku:           string;
  price:         number | null;
  originalPrice: number | null;
  stockQuantity: number | null;
  inStock:       boolean;
}

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
  stockQuantity?: number | null;   // null = untracked
  lowStockThreshold?: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  badge?: ProductBadge | null;
  deliveryOptions?: DeliveryOption[];
  vendorId?: string | null;
  vendorName?: string | null;
  status?: ProductStatus;
  // Dynamic category-specific attributes e.g. { ram: "8GB", storage: "128GB" }
  attributes?: Record<string, string>;
  variants?: ProductVariant[];
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
  // Dynamic attribute filters — key=attrKey, values=multiselect values
  attrs?:          Record<string, string[]>;
}

export interface FilterMeta {
  brands:        string[];
  subcategories: string[];
}

// ─── Category Attributes ─────────────────────────────────────────────────────

export type AttributeType = "text" | "select" | "multiselect" | "boolean" | "number";

export interface AttributeDef {
  key:        string;
  label:      string;
  type:       AttributeType;
  filterable: boolean;
  searchable: boolean;
  required:   boolean;
  options:    string[];
  order:      number;
}

export interface CategoryAttributes {
  _id:        string;
  category:   string;
  label:      string;
  attributes: AttributeDef[];
  isActive:   boolean;
  createdAt:  string;
  updatedAt:  string;
}

// A single dynamic filter group returned by /api/products/dynamic-filters
export interface DynamicFilterValue {
  value: string;
  count: number;
}

export interface DynamicFilterGroup {
  key:    string;
  label:  string;
  type:   AttributeType;
  values: DynamicFilterValue[];
}

export interface DynamicFiltersResult {
  filters: DynamicFilterGroup[];
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
  parentId:     string | null;
  level:        number;
  createdAt:    string;
}

// Hierarchical node returned by /api/categories/tree
export interface CategoryNode extends Category {
  children: CategoryNode[];
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

// ─── Dietary Options ─────────────────────────────────────────────────────────

export interface DietaryOption {
  _id:       string;
  value:     string;
  label:     string;
  emoji:     string;
  isActive:  boolean;
  order:     number;
  createdAt: string;
  updatedAt: string;
}

// ─── Cart ───────────────────────────────────────────────────────────────────

export interface CartItem {
  product:          Product;
  quantity:         number;
  variantId?:       string | null;
  selectedVariant?: ProductVariant;
}

export interface SavedCartItem {
  product: Product;
  savedAt: string;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export interface CartRecommendation {
  _id:           string;
  name:          string;
  slug:          string;
  price:         number;
  originalPrice?: number;
  images:        string[];
  brand:         string;
  unit:          string;
  rating:        number;
  inStock:       boolean;
  badge?:        ProductBadge | null;
  vendorName?:   string | null;
}

// ─── User / Auth ─────────────────────────────────────────────────────────────

export type UserRole = "customer" | "vendor" | "admin";
export type UserStatus = "active" | "suspended";

export type MarketingPreference = "email_digital_post" | "digital_post_only" | "unsubscribed";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  // Extended profile fields (populated after profile fetch)
  phone?: string | null;
  isPhoneVerified?: boolean;
  dietaryPreferences?: string[];
  marketingPreference?: MarketingPreference | null;
  hearFromBrands?: boolean;
  createdAt: string;
}

export interface AccountSetupStep {
  key:        string;
  label:      string;
  description: string;
  completed:  boolean;
  href:       string;
  linkLabel:  string;
}

export interface AccountProfile extends User {
  setupProgress: {
    totalSteps:     number;
    completedSteps: number;
    percentage:     number;
    steps:          AccountSetupStep[];
  };
}

export interface AuthFormData {
  name?: string;
  email: string;
  password: string;
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export type VendorStatus = "pending" | "active" | "suspended";

export type KycStatus = "not_submitted" | "pending" | "verified" | "rejected";

export interface VendorKyc {
  panNumber:       string;
  gstNumber:       string;
  aadhaarLast4:    string;
  status:          KycStatus;
  rejectionReason: string;
  submittedAt?:    string;
  reviewedAt?:     string;
}

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
  kyc?:        VendorKyc;
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
  productId:         string;
  variantId?:        string | null;
  variantLabel?:     string | null;
  vendorId?:         string | null;
  vendorName?:       string | null;
  name:              string;
  slug:              string;
  price:             number;
  quantity:          number;
  image:             string;
  commissionRate?:   number;
  commissionAmount?: number;
  vendorEarning?:    number;
}

// ─── Vendor Earnings ──────────────────────────────────────────────────────────

export type EarningStatus = "pending" | "confirmed" | "released";

export interface EarningLineItem {
  productId:        string;
  name:             string;
  quantity:         number;
  price:            number;
  commissionRate:   number;
  commissionAmount: number;
  netEarning:       number;
}

export interface VendorEarning {
  _id:             string;
  vendorId:        string;
  vendorName?:     string | null;
  orderId:         string;
  orderNumber:     string;
  orderDate:       string;
  items:           EarningLineItem[];
  grossAmount:     number;
  commissionTotal: number;
  netAmount:       number;
  status:          EarningStatus;
  releasedAt?:     string | null;
  payoutRef:       string;
  createdAt:       string;
}

export interface VendorEarningsSummary {
  totalPending:   number;
  totalConfirmed: number;
  totalReleased:  number;
  totalEarned:    number;
}

// ─── Commission ────────────────────────────────────────────────────────────────

export interface CommissionVendorRate {
  vendorId: string;
  rate:     number;
}

export interface CommissionConfig {
  defaultRate: number;
  vendorRates: CommissionVendorRate[];
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

// ─── Vendor Sub-Orders ────────────────────────────────────────────────────────

export type VendorOrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "PACKED"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED"
  | "REFUNDED"
  | "FAILED";

export type VendorRefundStatus = "none" | "partial" | "full";

export interface VendorOrderStatusHistory {
  status:    string;
  note:      string;
  updatedBy: string | null;
  role:      "admin" | "vendor" | "system";
  changedAt: string;
}

export interface VendorOrderItem {
  productId:        string;
  variantId?:       string | null;
  variantLabel?:    string | null;
  name:             string;
  slug:             string;
  price:            number;
  quantity:         number;
  image:            string;
  commissionRate:   number;
  commissionAmount: number;
  vendorEarning:    number;
}

export interface VendorOrder {
  _id:               string;
  parentOrderId:     string;
  parentOrderNumber: string;
  vendorId:          string;
  vendorName:        string;
  customerId?:       string | null;
  delivery?: {
    fullName: string;
    email:    string;
    phone:    string;
    address:  string;
    city:     string;
    postcode: string;
  };
  items:             VendorOrderItem[];
  subtotal:          number;
  commissionTotal:   number;
  vendorEarning:     number;
  status:            VendorOrderStatus;
  statusHistory:     VendorOrderStatusHistory[];
  trackingNumber?:   string | null;
  estimatedDelivery?: string | null;
  rejectionReason?:  string | null;
  cancellationReason?: string | null;
  refundStatus:      VendorRefundStatus;
  refundedAmount:    number;
  earningId?:        string | null;
  createdAt:         string;
  updatedAt:         string;
}

export type ParentOrderStatus =
  | "pending"
  | "partially_confirmed"
  | "processing"
  | "partially_delivered"
  | "completed"
  | "partially_cancelled"
  | "shipped"
  | "delivered"
  | "cancelled";

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
  deliverySlotId?:     string | null;
  deliverySlotDate?:   string | null;
  deliverySlotWindow?: string | null;
  vendorOrderIds?: string[];
  status:         ParentOrderStatus;
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
  _id:                string;
  productId:          string;
  productSlug:        string;
  userId:             string;
  userName:           string;
  rating:             number;
  title:              string;
  body:               string;
  isApproved:         boolean;
  isVerifiedPurchase: boolean;
  helpfulCount:       number;
  createdAt:          string;
}

export interface RatingSummary {
  average:      number;
  total:        number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

// ─── Delivery Slots ───────────────────────────────────────────────────────────

export type SlotWindow = "09:00-12:00" | "12:00-16:00" | "16:00-20:00" | "20:00-22:00";

export interface DeliverySlot {
  _id:         string;
  date:        string;      // "YYYY-MM-DD"
  window:      SlotWindow;
  capacity:    number;
  bookedCount: number;
  cutoffTime:  string;      // ISO
  isActive:    boolean;
  available:   number;      // capacity - bookedCount, computed by API
  createdAt:   string;
}

export interface DeliverySlotBooking {
  slotId:  string;
  date:    string;
  window:  SlotWindow;
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

// ─── Legal Pages ──────────────────────────────────────────────────────────────

export type LegalPageSlug = "terms" | "privacy";
export type ContentBlockType =
  | "paragraph"
  | "bulletList"
  | "numberedList"
  | "subheading"
  | "highlight";

export interface ContentBlock {
  type: ContentBlockType;
  text?: string;
  items?: string[];
}

export interface LegalSection {
  id: string;
  title: string;
  order: number;
  blocks: ContentBlock[];
}

export interface LegalPage {
  _id: string;
  slug: LegalPageSlug;
  title: string;
  introText: string;
  lastUpdated: string;
  effectiveDate: string;
  version: string;
  isPublished: boolean;
  sections: LegalSection[];
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
