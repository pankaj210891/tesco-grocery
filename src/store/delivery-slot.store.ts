import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeliverySlotBooking } from "@/types";

interface DeliverySlotState {
  pendingSlot:     DeliverySlotBooking | null;
  setPendingSlot:  (slot: DeliverySlotBooking | null) => void;
  clearPendingSlot: () => void;
}

export const useDeliverySlotStore = create<DeliverySlotState>()(
  persist(
    (set) => ({
      pendingSlot:      null,
      setPendingSlot:   (slot) => set({ pendingSlot: slot }),
      clearPendingSlot: ()     => set({ pendingSlot: null }),
    }),
    { name: "delivery-slot-store" },
  ),
);
