"use client";

import React from "react";
import { Store, CheckCircle2, XCircle, Clock, Truck, ChevronDown, ChevronUp, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { STATUS_META, ROLE_LABELS, type VendorOrderStatus, type ActorRole } from "@/constants/order-status";
import type { VendorOrder } from "@/types";

// Ordered steps for the vendor progress bar (operational pipeline only)
const PROGRESS_STEPS: VendorOrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "PACKED",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const STEP_RANK: Record<VendorOrderStatus, number> = {
  PENDING:          0,
  ACCEPTED:         1,
  PREPARING:        2,
  PACKED:           3,
  READY_FOR_PICKUP: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED:        6,
  CANCELLED:        -1,
  RETURNED:         -1,
  REFUNDED:         -1,
  FAILED:           -1,
};

function RoleIcon({ role }: { role: ActorRole }) {
  if (role === "admin")  return <ShieldCheck className="h-3 w-3 text-blue-500 shrink-0" />;
  if (role === "vendor") return <Store className="h-3 w-3 text-amber-500 shrink-0" />;
  return <User className="h-3 w-3 text-gray-400 shrink-0" />;
}

function VendorProgressBar({ status }: { status: VendorOrderStatus }) {
  const rank        = STEP_RANK[status] ?? 0;
  const isNegative  = rank < 0;
  const meta        = STATUS_META[status];

  if (isNegative) {
    return (
      <div className={cn("flex items-center gap-2 text-sm mt-2", meta?.colorCls)}>
        <XCircle className="h-4 w-4 shrink-0" />
        <span>{meta?.label ?? status}</span>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex gap-0.5">
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
                <span className="text-[9px] font-bold text-[#FCA311] dark:text-amber-400 whitespace-nowrap leading-none text-center">
                  {STATUS_META[step]?.label ?? step}
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
  const meta = STATUS_META[vo.status as VendorOrderStatus];

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

      {/* Status badge + progress bar */}
      <div className="px-4 py-3">
        <span className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border",
          meta?.bgCls,
          meta?.colorCls,
        )}>
          {meta?.label ?? vo.status}
        </span>
        <VendorProgressBar status={vo.status as VendorOrderStatus} />

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

      {/* Expandable: items + status history */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-3">
          {/* Items list */}
          <div className="space-y-2">
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
                  <span className="block font-semibold text-gray-900 dark:text-white text-xs">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Status history timeline */}
          {vo.statusHistory.length > 0 && (
            <details className="pt-1">
              <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Status history ({vo.statusHistory.length})
              </summary>
              <ol className="mt-2 space-y-2 pl-1">
                {[...vo.statusHistory].reverse().map((h, i) => {
                  const hMeta = STATUS_META[h.status as VendorOrderStatus];
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={cn("font-semibold", hMeta?.colorCls ?? "text-gray-700 dark:text-gray-300")}>
                            {hMeta?.label ?? h.status}
                          </span>
                          {/* Actor role badge */}
                          {h.role && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                              <RoleIcon role={h.role as ActorRole} />
                              {ROLE_LABELS[h.role as ActorRole] ?? h.role}
                            </span>
                          )}
                        </div>
                        {h.note && (
                          <p className="text-gray-400 dark:text-gray-500 mt-0.5 truncate">{h.note}</p>
                        )}
                        <p className="text-gray-400 dark:text-gray-600 mt-0.5">
                          {new Date(h.changedAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
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
