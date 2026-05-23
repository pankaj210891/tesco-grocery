"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, Calendar, CheckCircle, ChevronRight,
  ShoppingCart, Truck, Info,
} from "lucide-react";
import { toast } from "sonner";
import { useDeliverySlotStore } from "@/store/delivery-slot.store";
import DeliverySlotSelector from "@/components/checkout/DeliverySlotSelector";
import type { DeliverySlotBooking, Order } from "@/types";

const WINDOW_LABELS: Record<string, string> = {
  "09:00-12:00": "Morning (9am – 12pm)",
  "12:00-16:00": "Afternoon (12pm – 4pm)",
  "16:00-20:00": "Evening (4pm – 8pm)",
  "20:00-22:00": "Night (8pm – 10pm)",
};

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Upcoming booked slot card ─────────────────────────────────────────────────
function UpcomingSlotCard({ order }: { order: Order }) {
  if (!order.deliverySlotDate || !order.deliverySlotWindow) return null;

  return (
    <a
      href={`/account/orders/${order.orderNumber}`}
      className="flex items-start gap-3 p-4 rounded-xl border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10 hover:border-green-300 dark:hover:border-green-700/60 transition-colors group"
    >
      <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-800/30 flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle className="h-4.5 w-4.5 text-green-600 dark:text-green-400" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
          {formatDate(order.deliverySlotDate)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {WINDOW_LABELS[order.deliverySlotWindow] ?? order.deliverySlotWindow}
        </p>
        <p className="text-[11px] text-green-600 dark:text-green-400 font-semibold mt-1">
          Order {order.orderNumber}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-green-500 transition-colors shrink-0 mt-2.5" aria-hidden />
    </a>
  );
}

// ── Pending slot banner ───────────────────────────────────────────────────────
function PendingSlotBanner({
  slot,
  onClear,
  onCheckout,
}: {
  slot:       DeliverySlotBooking;
  onClear:    () => void;
  onCheckout: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#FCA311]/40 bg-amber-50/60 dark:bg-amber-900/10 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#FCA311]/10 flex items-center justify-center shrink-0">
        <Clock className="h-4 w-4 text-[#FCA311]" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Slot saved for checkout</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {formatDate(slot.date)}, {WINDOW_LABELS[slot.window] ?? slot.window}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onClear}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium"
        >
          Remove
        </button>
        <button
          onClick={onCheckout}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FCA311] text-white text-xs font-bold rounded-lg hover:bg-[#E8920A] transition-colors"
        >
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
          Go to Checkout
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  orders: Order[];
}

export default function DeliverySlotPanel({ orders }: Props) {
  const router = useRouter();
  const { pendingSlot, setPendingSlot, clearPendingSlot } = useDeliverySlotStore();

  const [selectedSlot, setSelectedSlot] = useState<DeliverySlotBooking | null>(
    pendingSlot ?? null,
  );

  // Orders that have a future delivery slot booked (tied to a real order)
  const upcomingSlots = orders.filter(
    (o) => o.deliverySlotDate && o.deliverySlotDate >= todayStr(),
  );

  function handleSlotChange(booking: DeliverySlotBooking | null) {
    setSelectedSlot(booking);
    // Clear saved slot if user deselects
    if (!booking) clearPendingSlot();
  }

  function handleSaveAndCheckout() {
    if (!selectedSlot) return;
    setPendingSlot(selectedSlot);
    toast.success("Delivery slot saved — taking you to checkout.");
    router.push("/checkout");
  }

  function handleSaveSlot() {
    if (!selectedSlot) return;
    setPendingSlot(selectedSlot);
    toast.success(
      `Slot saved: ${formatDate(selectedSlot.date)}, ${WINDOW_LABELS[selectedSlot.window] ?? selectedSlot.window}`,
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Pending slot from store ── */}
      {pendingSlot && (
        <PendingSlotBanner
          slot={pendingSlot}
          onClear={clearPendingSlot}
          onCheckout={() => router.push("/checkout")}
        />
      )}

      {/* ── Upcoming booked slots ── */}
      {upcomingSlots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Upcoming deliveries
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({upcomingSlots.length})
            </span>
          </div>
          <div className="space-y-2">
            {upcomingSlots.map((o) => (
              <UpcomingSlotCard key={o._id} order={o} />
            ))}
          </div>
        </div>
      )}

      {/* ── New slot picker ── */}
      <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#FCA311]" aria-hidden />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Book a delivery slot
          </h3>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
          <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Select a date and time window below. Save your slot now and it will be
            automatically applied when you go to checkout.
          </p>
        </div>

        <DeliverySlotSelector value={selectedSlot} onChange={handleSlotChange} />

        {selectedSlot && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={handleSaveSlot}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-[#0F4C75] text-[#0F4C75] dark:text-blue-400 dark:border-blue-500 text-sm font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <CheckCircle className="h-4 w-4" aria-hidden />
              Save slot
            </button>
            <button
              onClick={handleSaveAndCheckout}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FCA311] text-white text-sm font-bold rounded-xl hover:bg-[#E8920A] transition-colors"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              Save &amp; go to checkout
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* ── Help note ── */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Slots are reserved when you complete your order at checkout.
        Availability may change before you complete your purchase.
      </p>

    </div>
  );
}
