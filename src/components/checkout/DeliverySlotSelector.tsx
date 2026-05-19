"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import type { DeliverySlot, DeliverySlotBooking } from "@/types";

interface DateAvailability {
  date:            string;
  hasAvailability: boolean;
  totalAvailable:  number;
}

interface Props {
  value?:    DeliverySlotBooking | null;
  onChange:  (booking: DeliverySlotBooking | null) => void;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function slotsLeft(slot: DeliverySlot): number {
  return Math.max(0, slot.capacity - slot.bookedCount);
}

const WINDOW_LABELS: Record<string, string> = {
  "09:00-12:00": "Morning  (9am – 12pm)",
  "12:00-16:00": "Afternoon (12pm – 4pm)",
  "16:00-20:00": "Evening  (4pm – 8pm)",
  "20:00-22:00": "Night    (8pm – 10pm)",
};

export default function DeliverySlotSelector({ value, onChange }: Props) {
  const [availDates, setAvailDates] = useState<DateAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(value?.date ?? "");
  const [slots,        setSlots]        = useState<DeliverySlot[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Load available dates on mount
  useEffect(() => {
    fetch("/api/delivery-slots/available-dates")
      .then((r) => r.json() as Promise<{ success: boolean; data: DateAvailability[] }>)
      .then((json) => { if (json.success) setAvailDates(json.data); })
      .catch(() => {})
      .finally(() => setLoadingDates(false));
  }, []);

  // Load slots when a date is selected
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedDate) { setSlots([]); return; }
    setLoadingSlots(true);

    fetch(`/api/delivery-slots?date=${selectedDate}`)
      .then((r) => r.json() as Promise<{ success: boolean; data: DeliverySlot[] }>)
      .then((json) => { if (json.success) setSlots(json.data); })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    onChange(null);
  }

  function handleSlotSelect(slot: DeliverySlot) {
    if (slotsLeft(slot) === 0) return;
    onChange({ slotId: slot._id, date: slot.date, window: slot.window });
  }

  const hasSlots   = slots.some((s) => slotsLeft(s) > 0);
  const isSelected = (slot: DeliverySlot) => value?.slotId === slot._id;

  return (
    <div className="space-y-4" data-testid="delivery-slot-selector">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[#FCA311]" />
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Choose Delivery Date</h3>
      </div>

      {/* Date picker */}
      {loadingDates ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1,2,3,4,5].map((n) => (
            <div key={n} className="h-16 w-20 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : availDates.length === 0 ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          No delivery slots available in the next 7 days.
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {availDates.map((d) => {
            const active = d.date === selectedDate;
            return (
              <button
                key={d.date}
                disabled={!d.hasAvailability}
                onClick={() => handleDateSelect(d.date)}
                data-testid={`slot-date-${d.date}`}
                className={`shrink-0 flex flex-col items-center justify-center px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors min-w-[72px] ${
                  !d.hasAvailability
                    ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    : active
                    ? "bg-[#FCA311] border-[#FCA311] text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#FCA311] hover:text-[#FCA311] dark:hover:text-amber-400"
                }`}
              >
                {formatDate(d.date)}
                {d.hasAvailability && (
                  <span className={`mt-0.5 text-[10px] ${active ? "text-white/80" : "text-gray-400 dark:text-gray-500"}`}>
                    {d.totalAvailable} left
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Time slots */}
      {selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#FCA311]" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Choose Time Slot</h3>
          </div>

          {loadingSlots ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : !hasSlots ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              All slots for this date are fully booked. Please choose another date.
            </div>
          ) : (
            <div className="grid gap-2">
              {slots.map((slot) => {
                const available = slotsLeft(slot);
                const full      = available === 0;
                const selected  = isSelected(slot);

                return (
                  <button
                    key={slot._id}
                    disabled={full}
                    onClick={() => handleSlotSelect(slot)}
                    data-testid={`slot-window-${slot.window}`}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      full
                        ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : selected
                        ? "bg-amber-50 dark:bg-amber-900/20 border-[#FCA311] text-[#FCA311] dark:text-amber-400 shadow-sm"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#FCA311] hover:bg-amber-50/40 dark:hover:bg-amber-900/10"
                    }`}
                  >
                    <span>{WINDOW_LABELS[slot.window] ?? slot.window}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {full ? (
                        <span className="text-xs text-gray-400">Full</span>
                      ) : (
                        <>
                          <span className={`text-xs ${available <= 5 ? "text-amber-500 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
                            {available <= 5 ? `${available} left!` : "Available"}
                          </span>
                          {selected && <CheckCircle className="h-4 w-4 text-[#FCA311]" />}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected summary */}
      {value && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="font-semibold">
            {formatDate(value.date)}, {WINDOW_LABELS[value.window] ?? value.window}
          </span>
        </div>
      )}
    </div>
  );
}
