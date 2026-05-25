/**
 * Canonical payload types for every BullMQ job across all five queues.
 * These are plain-object shapes — no class instances, no Mongoose documents —
 * so they survive JSON serialisation to/from Redis intact.
 */

import type {
  OrderConfirmationData,
  OrderStatusData,
  OrderCancellationData,
  RefundConfirmedData,
  WelcomeData,
  PasswordResetData,
  VendorInviteData,
  VendorApprovedData,
  VendorNewOrderData,
  VendorOrderStatusData,
  VendorPayoutData,
} from "@/lib/email/templates";

// ── Email Queue ───────────────────────────────────────────────────────────────

export type EmailJobName =
  | "send-order-confirmation"
  | "send-order-status"
  | "send-welcome"
  | "send-password-reset"
  | "send-order-cancellation"
  | "send-refund-confirmed"
  | "send-vendor-invite"
  | "send-vendor-approved"
  | "send-vendor-new-order"
  | "send-vendor-order-status"
  | "send-vendor-payout";

/**
 * All email jobs share this envelope.  `templateType` drives the switch in the
 * processor; `payload` carries the template-specific data.
 */
export interface EmailJobData {
  to: string;
  templateType: EmailJobName;
  payload:
    | OrderConfirmationData
    | OrderStatusData
    | OrderCancellationData
    | RefundConfirmedData
    | WelcomeData
    | PasswordResetData
    | VendorInviteData
    | VendorApprovedData
    | VendorNewOrderData
    | VendorOrderStatusData
    | VendorPayoutData;
}

// ── Vendor Notifications Queue ────────────────────────────────────────────────

/** One entry per vendor in a multi-vendor order. */
export interface VendorGroupForQueue {
  vendorId:  string;
  items:     Array<{ name: string; quantity: number; price: number }>;
  subtotal:  number;
}

export interface VendorNewOrderJobData {
  orderId:      string;
  orderNumber:  string;
  dashboardBase: string;
  vendorGroups: VendorGroupForQueue[];
}

export type VendorNotificationJobName = "notify-vendor-new-order";
export type VendorNotificationJobData = VendorNewOrderJobData;

// ── Stock Updates Queue ───────────────────────────────────────────────────────

export interface StockItem {
  productId: string;
  variantId?: string | null;
  quantity:  number;
}

export type StockJobName = "mark-out-of-stock" | "restore-stock";

export interface MarkOutOfStockJobData {
  jobType: "mark-out-of-stock";
  items:   StockItem[];
}

export interface RestoreStockJobData {
  jobType: "restore-stock";
  items:   StockItem[];
}

export type StockJobData = MarkOutOfStockJobData | RestoreStockJobData;

// ── Payout Queue ──────────────────────────────────────────────────────────────

export type PayoutJobName = "confirm-earnings" | "notify-vendor-payout";

export interface ConfirmEarningsJobData {
  jobType:  "confirm-earnings";
  orderId:  string;
  vendorId?: string;
}

export interface VendorPayoutNotificationJobData {
  jobType:      "notify-vendor-payout";
  vendorId:     string;
  amount:       number;
  payoutRef:    string;
  orderNumbers: string[];
}

export type PayoutJobData = ConfirmEarningsJobData | VendorPayoutNotificationJobData;

// ── Analytics Queue ───────────────────────────────────────────────────────────

export type AnalyticsJobName = "record-event";

export interface AnalyticsEventJobData {
  event:      string;
  userId?:    string;
  properties: Record<string, unknown>;
  timestamp:  string; // ISO-8601
}

export type AnalyticsJobData = AnalyticsEventJobData;

// ── Dead Letter Queue ─────────────────────────────────────────────────────────

export interface DeadLetterJobData {
  originalQueue:   string;
  originalJobName: string;
  originalJobId:   string;
  data:            unknown;
  error:           string;
  failedAt:        string; // ISO-8601
  attemptsMade:    number;
}
