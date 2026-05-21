// ─── Vendor-managed operational statuses ──────────────────────────────────────
// These are the only statuses a vendor role may set on their own sub-orders.

export const VENDOR_OP_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "PACKED",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
] as const;

// ─── Admin-exclusive statuses ─────────────────────────────────────────────────
// Only admin can set these — either as a terminal override or during a refund/force-cancel flow.

export const ADMIN_ONLY_STATUSES = [
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
  "FAILED",
] as const;

// ─── Combined enum ────────────────────────────────────────────────────────────

export const ALL_VENDOR_ORDER_STATUSES = [
  ...VENDOR_OP_STATUSES,
  ...ADMIN_ONLY_STATUSES,
] as const;

export type VendorOpStatus    = typeof VENDOR_OP_STATUSES[number];
export type AdminOnlyStatus   = typeof ADMIN_ONLY_STATUSES[number];
export type VendorOrderStatus = typeof ALL_VENDOR_ORDER_STATUSES[number];

export type ActorRole = "admin" | "vendor" | "system";

// ─── Terminal status set ──────────────────────────────────────────────────────

export const TERMINAL_STATUSES = new Set<VendorOrderStatus>([
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
  "FAILED",
]);

// ─── Vendor-allowed transitions ───────────────────────────────────────────────
// Vendors may only advance through the operational pipeline.
// Backward transitions (e.g. PREPARING → PENDING) are intentionally absent.

export const VENDOR_TRANSITIONS: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  PENDING:          ["ACCEPTED"],
  ACCEPTED:         ["PREPARING"],
  PREPARING:        ["PACKED"],
  PACKED:           ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"],
  READY_FOR_PICKUP: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED:        [],
  CANCELLED:        [],
  RETURNED:         [],
  REFUNDED:         [],
  FAILED:           [],
};

// ─── Admin-allowed transitions ────────────────────────────────────────────────
// Admin has full override power and may jump to any reachable status.
// Does NOT permit delivered → preparing (backward skip) but does allow force-cancel/refund anywhere.

export const ADMIN_TRANSITIONS: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  PENDING:          ["ACCEPTED", "PREPARING", "PACKED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED"],
  ACCEPTED:         ["PREPARING", "PACKED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED"],
  PREPARING:        ["PACKED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED"],
  PACKED:           ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED"],
  READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED", "RETURNED", "FAILED"],
  DELIVERED:        ["RETURNED", "REFUNDED"],
  CANCELLED:        ["REFUNDED", "FAILED"],
  RETURNED:         ["REFUNDED"],
  REFUNDED:         [],
  FAILED:           ["REFUNDED", "CANCELLED"],
};

// ─── Transition validation utility ───────────────────────────────────────────

export interface TransitionResult {
  valid:  boolean;
  error?: string;
}

export function validateStatusTransition(
  from: VendorOrderStatus,
  to:   VendorOrderStatus,
  role: "vendor" | "admin",
): TransitionResult {
  const map     = role === "admin" ? ADMIN_TRANSITIONS : VENDOR_TRANSITIONS;
  const allowed = map[from] ?? [];

  if (!allowed.includes(to)) {
    return {
      valid: false,
      error: `Cannot transition from ${from} to ${to}. Allowed: ${allowed.join(", ") || "none"}`,
    };
  }
  return { valid: true };
}

// ─── UI metadata ──────────────────────────────────────────────────────────────

export interface StatusMeta {
  label:    string;
  colorCls: string;
  bgCls:    string;
  terminal: boolean;
}

export const STATUS_META: Record<VendorOrderStatus, StatusMeta> = {
  PENDING:          { label: "Pending",           colorCls: "text-yellow-600 dark:text-yellow-400",  bgCls: "bg-yellow-100 dark:bg-yellow-900/30",  terminal: false },
  ACCEPTED:         { label: "Accepted",          colorCls: "text-blue-600   dark:text-blue-400",    bgCls: "bg-blue-100   dark:bg-blue-900/30",    terminal: false },
  PREPARING:        { label: "Preparing",         colorCls: "text-indigo-600 dark:text-indigo-400",  bgCls: "bg-indigo-100 dark:bg-indigo-900/30",  terminal: false },
  PACKED:           { label: "Packed",            colorCls: "text-purple-600 dark:text-purple-400",  bgCls: "bg-purple-100 dark:bg-purple-900/30",  terminal: false },
  READY_FOR_PICKUP: { label: "Ready for Pickup",  colorCls: "text-cyan-600   dark:text-cyan-400",    bgCls: "bg-cyan-100   dark:bg-cyan-900/30",    terminal: false },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",  colorCls: "text-orange-600 dark:text-orange-400",  bgCls: "bg-orange-100 dark:bg-orange-900/30",  terminal: false },
  DELIVERED:        { label: "Delivered",         colorCls: "text-green-600  dark:text-green-400",   bgCls: "bg-green-100  dark:bg-green-900/30",   terminal: true  },
  CANCELLED:        { label: "Cancelled",         colorCls: "text-red-600    dark:text-red-400",     bgCls: "bg-red-100    dark:bg-red-900/30",     terminal: true  },
  RETURNED:         { label: "Returned",          colorCls: "text-gray-600   dark:text-gray-400",    bgCls: "bg-gray-100   dark:bg-gray-800",       terminal: true  },
  REFUNDED:         { label: "Refunded",          colorCls: "text-teal-600   dark:text-teal-400",    bgCls: "bg-teal-100   dark:bg-teal-900/30",    terminal: true  },
  FAILED:           { label: "Failed",            colorCls: "text-rose-600   dark:text-rose-400",    bgCls: "bg-rose-100   dark:bg-rose-900/30",    terminal: true  },
};

// ─── Role label helper ────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<ActorRole, string> = {
  admin:  "Admin",
  vendor: "Vendor",
  system: "System",
};
