import React from "react";
import { CheckCircle2, Circle, Package, Cpu, Truck, Home, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Order } from "@/types";

const STATUS_RANK: Record<Order["status"], number> = {
  pending: 0, processing: 1, shipped: 2, delivered: 3, cancelled: -1,
};

interface Step {
  key:    Order["status"];
  label:  string;
  desc:   string;
  Icon:   React.FC<{ className?: string }>;
}

const STEPS: Step[] = [
  { key: "pending",    label: "Order Placed",  desc: "We received your order",          Icon: Package  },
  { key: "processing", label: "Processing",    desc: "Your order is being prepared",    Icon: Cpu      },
  { key: "shipped",    label: "Shipped",       desc: "Your order is on the way",        Icon: Truck    },
  { key: "delivered",  label: "Delivered",     desc: "Order delivered successfully",    Icon: Home     },
];

export default function OrderTimeline({ status }: { status: Order["status"] }) {
  if (status === "cancelled") {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-bold text-red-600 dark:text-red-400 text-base">Order Cancelled</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This order has been cancelled. Contact support if you need help.
          </p>
        </div>
      </div>
    );
  }

  const currentRank = STATUS_RANK[status] ?? 0;

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes line-sweep {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0);   }
        }
        .step-pulse::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          border: 2px solid #FCA311;
          animation: pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite;
        }
        .dark .step-pulse::before { border-color: #60a5fa; }
        .connector-fill {
          animation: line-sweep 0.7s cubic-bezier(0.4,0,0.2,1) forwards;
        }
      `}</style>

      {/* Horizontal timeline (md+)
          Each step is a fixed-width column so connectors always fill the remaining space evenly.
          Label text + dot use flex so the dot is always inline with the label. */}
      <div className="hidden md:flex items-start w-full">
        {STEPS.map((step, idx) => {
          const stepRank   = STATUS_RANK[step.key] ?? 0;
          const isDone     = currentRank > stepRank;
          const isCurrent  = currentRank === stepRank;
          const isUpcoming = currentRank < stepRank;
          const isLast     = idx === STEPS.length - 1;
          const { Icon }   = step;

          return (
            <React.Fragment key={step.key}>
              {/* Step column — fixed 100px, content centered */}
              <div className="flex flex-col items-center" style={{ width: 100, flexShrink: 0 }}>
                {/* Node */}
                <div className="relative flex items-center justify-center">
                  {isCurrent && (
                    <span className="step-pulse absolute inset-0 rounded-full" />
                  )}
                  <div
                    className={cn(
                      "relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                      isDone     && "bg-green-500 border-green-500 shadow-md shadow-green-200 dark:shadow-green-900/40",
                      isCurrent  && "bg-[#FCA311] border-[#FCA311] shadow-md shadow-blue-200 dark:shadow-blue-900/40",
                      isUpcoming && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : isCurrent ? (
                      <Icon className="h-5 w-5 text-white" />
                    ) : (
                      <Icon className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                </div>

                {/* Label — flex keeps dot on the same line as the text */}
                <div className="mt-3 w-full text-center">
                  <p
                    className={cn(
                      "text-xs font-bold transition-colors leading-tight flex items-center justify-center gap-1 whitespace-nowrap",
                      isDone     && "text-green-600 dark:text-green-400",
                      isCurrent  && "text-[#FCA311] dark:text-amber-400",
                      isUpcoming && "text-gray-400 dark:text-gray-600",
                    )}
                  >
                    <span>{step.label}</span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FCA311] dark:bg-blue-400 shrink-0 animate-bounce" />
                    )}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-0.5 leading-tight",
                      (isDone || isCurrent) ? "text-gray-500 dark:text-gray-400" : "text-gray-300 dark:text-gray-600",
                    )}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* Connector — flex-1 fills the gap; mt-5 aligns it to node centre (20px from top) */}
              {!isLast && (
                <div className="flex-1 relative h-[3px] rounded-full bg-gray-200 dark:bg-gray-700 mt-5 -translate-y-[1.5px]">
                  {isDone && (
                    <div
                      className="absolute inset-0 rounded-full bg-green-500 connector-fill"
                      style={{ animationDelay: `${idx * 0.4}s` }}
                    />
                  )}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FCA311] to-gray-200 dark:to-gray-700" />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Vertical timeline (< md) */}
      <ol className="md:hidden relative space-y-0">
        {STEPS.map((step, idx) => {
          const stepRank   = STATUS_RANK[step.key] ?? 0;
          const isDone     = currentRank > stepRank;
          const isCurrent  = currentRank === stepRank;
          const isUpcoming = currentRank < stepRank;
          const isLast     = idx === STEPS.length - 1;
          const { Icon }   = step;

          return (
            <li key={step.key} className="flex gap-4">
              {/* Column: dot + line */}
              <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  {isCurrent && (
                    <span className="step-pulse absolute inset-0 rounded-full" />
                  )}
                  <div
                    className={cn(
                      "relative w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 transition-all duration-500",
                      isDone    && "bg-green-500 border-green-500 shadow-sm",
                      isCurrent && "bg-[#FCA311] border-[#FCA311] shadow-sm",
                      isUpcoming && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : isCurrent ? (
                      <Icon className="h-4 w-4 text-white" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 my-1 min-h-[1.5rem] transition-colors duration-500",
                      isDone ? "bg-green-400 dark:bg-green-600" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn("pb-6", isLast && "pb-0")}>
                <p
                  className={cn(
                    "text-sm font-bold leading-none mt-2 transition-colors",
                    isDone    && "text-green-600 dark:text-green-400",
                    isCurrent && "text-[#FCA311] dark:text-amber-400",
                    isUpcoming && "text-gray-400 dark:text-gray-600",
                  )}
                >
                  {step.label}
                  {isCurrent && (
                    <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#FCA311] dark:text-amber-400 align-middle">
                      Current
                    </span>
                  )}
                </p>
                <p
                  className={cn(
                    "text-xs mt-0.5",
                    (isDone || isCurrent) ? "text-gray-500 dark:text-gray-400" : "text-gray-300 dark:text-gray-600",
                  )}
                >
                  {step.desc}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
