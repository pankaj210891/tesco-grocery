"use client";

import React from "react";
import { Store, CheckCircle2, XCircle, Clock, Truck, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import type { VendorOrder, VendorOrderStatus } from "@/types";

const STATUS_META: Record<VendorOrderStatus, { label: string; color: string; bg: string }> = {
  PENDING:          { label: "Awaiting confirmation", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40" },
  ACCEPTED:         { label: "Confirmed",             color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40" },
  PREPARING:        { label: "Being prepared",        color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40" },
  PACKED:           { label: "Packed",                color: "text-indigo-600 dark:text-indigo-400",bg: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40" },
  OUT_FOR_DELIVERY: { label: "Out for delivery",      color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40" },
  DELIVERED:        { label: "Delivered",             color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40" },
  CANCELLED:        { label: "Cancelled",             color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40" },
  RETURNED:         { label: "Returned",              color: "text-orange-600 dark:text-orange-400",bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40" },
  REFUNDED:         { label: "Refunded",              color: "text-teal-600 dark:text-teal-400",    bg: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/40" },
};

// Ordered steps for the vendor progress bar (excludes terminal states)
const PROGRESS_STEPS: VendorOrderStatus[] = [
  "PENDING", "ACCEPTED", "PREPARING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED",
];

const STEP_RANK: Record<VendorOrderStatus, number> = {
  PENDING: 0, ACCEPTED: 1, PREPARING: 2, PACKED: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5,
  CANCELLED: -1, RETURNED: -1, REFUNDED: -1,
};

function VendorStatusBadge({ status }: { status: VendorOrderStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border", meta.bg, meta.color)}>
      {meta.label}
    </span>
  );
}

function VendorProgressBar({ status }: { status: VendorOrderStatus }) {
  const rank = STEP_RANK[status] ?? 0;
  const isCancelled = status === "CANCELLED" || status === "RETURNED" || status === "REFUNDED";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400 mt-2">
        <XCircle className="h-4 w-4 shrink-0" />
        <span>{STATUS_META[status].label}</span>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex gap-1">
        {PROGRESS_STEPS.map((step, idx) => {
          const stepRank = STEP_RANK[step];
          const done     = rank > stepRank;
          const current  = rank === stepRank;
          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors",
                  done    && "bg-green-500",
                  current && "bg-[#FCA311]",
                  !done && !current && "bg-gray-200 dark:bg-gray-700",
                )}
              />
              {idx === rank && (
                <span className="text-[9px] font-bold text-[#FCA311] dark:text-amber-400 whitespace-nowrap leading-none">
                  {STATUS_META[step].label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VendorOrderCard({ vo }: { vo: VendorOrder }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Vendor header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <Store className="h-4 w-4 text-[#FCA311] shrink-0" aria-hidden />
          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{vo.vendorName}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            · {vo.items.reduce((s, i) => s + i.quantity, 0)} item{vo.items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => setExpanded((p) => !p)}
          aria-label={expanded ? "Collapse vendor order" : "Expand vendor order"}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Status + progress */}
      <div className="px-4 py-3">
        <VendorStatusBadge status={vo.status} />
        <VendorProgressBar status={vo.status} />

        {vo.trackingNumber && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Tracking:</span> {vo.trackingNumber}
          </p>
        )}

        {vo.cancellationReason && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            <span className="font-semibold">Reason:</span> {vo.cancellationReason}
          </p>
        )}
      </div>

      {/* Expandable items */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
          {vo.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">{item.name}</span>
                {item.variantLabel && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{item.variantLabel}</span>
                )}
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">×{item.quantity}</span>
                <span className="block font-semibold text-gray-900 dark:text-white text-xs">{formatPrice(item.price * item.quantity)}</span>
              </div>
            </div>
          ))}

          {/* Status history */}
          {vo.statusHistory.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Status history ({vo.statusHistory.length})
              </summary>
              <ol className="mt-2 space-y-1.5 pl-1">
                {[...vo.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-400 shrink-0" />
                    <span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{h.status}</span>
                      {h.note && ` — ${h.note}`}
                      <span className="ml-1 text-gray-400 dark:text-gray-500">
                        · {new Date(h.changedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function VendorOrderTracking({ vendorOrders }: { vendorOrders: VendorOrder[] }) {
  if (vendorOrders.length === 0) return null;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white mb-4">
        <Truck className="h-4 w-4 text-[#FCA311]" aria-hidden />
        Vendor Tracking
        <span className="ml-auto text-xs font-semibold text-gray-400 dark:text-gray-500">
          {vendorOrders.length} vendor{vendorOrders.length !== 1 ? "s" : ""}
        </span>
      </h2>
      <div className="space-y-3">
        {vendorOrders.map((vo) => (
          <VendorOrderCard key={vo._id} vo={vo} />
        ))}
      </div>
    </section>
  );
}
