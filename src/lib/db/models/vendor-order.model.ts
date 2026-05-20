import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const VENDOR_ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;

export type VendorOrderStatus = typeof VENDOR_ORDER_STATUSES[number];

const StatusHistorySchema = new Schema(
  {
    status:    { type: String, required: true },
    note:      { type: String, default: "" },
    changedAt: { type: Date,   default: () => new Date() },
  },
  { _id: false },
);

const VendorOrderItemSchema = new Schema(
  {
    productId:        { type: String, required: true },
    variantId:        { type: String, default: null },
    variantLabel:     { type: String, default: null },
    name:             { type: String, required: true },
    slug:             { type: String, default: "" },
    price:            { type: Number, required: true },
    quantity:         { type: Number, required: true },
    image:            { type: String, default: "" },
    commissionRate:   { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    vendorEarning:    { type: Number, default: 0 },
  },
  { _id: false },
);

const VendorOrderSchema = new Schema(
  {
    parentOrderId:     { type: Schema.Types.ObjectId, ref: "Order",  required: true },
    parentOrderNumber: { type: String, required: true },
    vendorId:          { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    vendorName:        { type: String, required: true },
    customerId:        { type: Schema.Types.ObjectId, ref: "User",   default: null },

    items: { type: [VendorOrderItemSchema], default: [] },

    subtotal:        { type: Number, required: true },
    commissionTotal: { type: Number, required: true },
    vendorEarning:   { type: Number, required: true },

    status: {
      type:    String,
      enum:    VENDOR_ORDER_STATUSES,
      default: "PENDING",
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },

    // Tracking
    trackingNumber:    { type: String, default: null },
    estimatedDelivery: { type: Date,   default: null },

    // Rejection / cancellation
    rejectionReason:    { type: String, default: null },
    cancellationReason: { type: String, default: null },

    // Refund
    refundStatus:   { type: String, enum: ["none", "partial", "full"], default: "none" },
    refundedAmount: { type: Number, default: 0 },

    // Link to the earnings ledger entry created for this sub-order
    earningId: { type: Schema.Types.ObjectId, ref: "VendorEarning", default: null },
  },
  { timestamps: true },
);

// Indexes for common query patterns
VendorOrderSchema.index({ parentOrderId: 1 });
VendorOrderSchema.index({ vendorId: 1, createdAt: -1 });
VendorOrderSchema.index({ vendorId: 1, status: 1 });
VendorOrderSchema.index({ customerId: 1, createdAt: -1 });
VendorOrderSchema.index({ parentOrderNumber: 1 });
VendorOrderSchema.index({ status: 1, createdAt: -1 });

export type VendorOrderDoc = InferSchemaType<typeof VendorOrderSchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const VendorOrderModel =
  (mongoose.models.VendorOrder as mongoose.Model<VendorOrderDoc>) ||
  mongoose.model<VendorOrderDoc>("VendorOrder", VendorOrderSchema);

export default VendorOrderModel;
