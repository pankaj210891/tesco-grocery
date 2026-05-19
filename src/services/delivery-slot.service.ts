import { connectDB } from "@/lib/db/mongoose";
import DeliverySlotModel from "@/lib/db/models/delivery-slot.model";

/**
 * Atomically increments bookedCount for a slot, only if capacity is not exceeded.
 * Returns true on success, false if the slot is full or unavailable.
 *
 * Uses findOneAndUpdate with a query guard ($where bookedCount < capacity)
 * to prevent race conditions / overbooking.
 */
export async function bookDeliverySlot(slotId: string): Promise<boolean> {
  await connectDB();

  const updated = await DeliverySlotModel.findOneAndUpdate(
    {
      _id:      slotId,
      isActive: true,
      cutoffTime: { $gt: new Date() },
      $expr: { $lt: ["$bookedCount", "$capacity"] },
    },
    { $inc: { bookedCount: 1 } },
    { new: true },
  );

  return !!updated;
}

/**
 * Releases a previously booked slot (e.g. on order cancellation).
 * Decrements bookedCount, floored at 0.
 */
export async function releaseDeliverySlot(slotId: string): Promise<void> {
  await connectDB();
  await DeliverySlotModel.findOneAndUpdate(
    { _id: slotId, bookedCount: { $gt: 0 } },
    { $inc: { bookedCount: -1 } },
  );
}
