import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { SLOT_WINDOWS } from "@/lib/constants/delivery-slots";

export { SLOT_WINDOWS } from "@/lib/constants/delivery-slots";
export type { SlotWindow } from "@/lib/constants/delivery-slots";

const DeliverySlotSchema = new Schema(
  {
    date:        { type: String, required: true },          // "YYYY-MM-DD"
    window:      { type: String, enum: SLOT_WINDOWS, required: true },
    capacity:    { type: Number, required: true, min: 1, default: 50 },
    bookedCount: { type: Number, default: 0, min: 0 },
    cutoffTime:  { type: Date, required: true },            // booking closes at this time
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One slot per date+window combination
DeliverySlotSchema.index({ date: 1, window: 1 }, { unique: true });
DeliverySlotSchema.index({ date: 1, isActive: 1 });

export type DeliverySlotDoc = InferSchemaType<typeof DeliverySlotSchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const DeliverySlotModel =
  (mongoose.models.DeliverySlot as mongoose.Model<DeliverySlotDoc>) ||
  mongoose.model<DeliverySlotDoc>("DeliverySlot", DeliverySlotSchema);

export default DeliverySlotModel;
