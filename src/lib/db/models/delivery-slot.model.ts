import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const SLOT_WINDOWS = [
  "09:00-12:00",
  "12:00-16:00",
  "16:00-20:00",
  "20:00-22:00",
] as const;

export type SlotWindow = typeof SLOT_WINDOWS[number];

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
