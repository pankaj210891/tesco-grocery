import mongoose, { Schema, type InferSchemaType } from "mongoose";

const EarningItemSchema = new Schema(
  {
    productId:        { type: String, required: true },
    name:             { type: String, required: true },
    quantity:         { type: Number, required: true },
    price:            { type: Number, required: true },
    commissionRate:   { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    netEarning:       { type: Number, required: true },
  },
  { _id: false }
);

const VendorEarningSchema = new Schema(
  {
    vendorId:        { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    orderId:         { type: Schema.Types.ObjectId, ref: "Order",  required: true },
    orderNumber:     { type: String, required: true },
    orderDate:       { type: Date,   required: true },
    items:           { type: [EarningItemSchema], default: [] },
    grossAmount:     { type: Number, required: true },
    commissionTotal: { type: Number, required: true },
    netAmount:       { type: Number, required: true },
    status: {
      type:    String,
      enum:    ["pending", "confirmed", "released"],
      default: "pending",
    },
    releasedAt:    { type: Date,                default: null },
    payoutRef:     { type: String,              default: "" },
    vendorOrderId: { type: Schema.Types.ObjectId, ref: "VendorOrder", default: null },
  },
  { timestamps: true }
);

VendorEarningSchema.index({ vendorId: 1, createdAt: -1 });
VendorEarningSchema.index({ orderId: 1 });
VendorEarningSchema.index({ status: 1 });
VendorEarningSchema.index({ vendorId: 1, status: 1 });

export type VendorEarningDoc = InferSchemaType<typeof VendorEarningSchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const VendorEarningModel =
  (mongoose.models.VendorEarning as mongoose.Model<VendorEarningDoc>) ||
  mongoose.model<VendorEarningDoc>("VendorEarning", VendorEarningSchema);

export default VendorEarningModel;
