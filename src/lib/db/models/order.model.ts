import mongoose, { Schema, type InferSchemaType } from "mongoose";

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId:      { type: Schema.Types.ObjectId, ref: "User" },
    items: [
      {
        productId:  String,
        vendorId:   { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
        vendorName: { type: String, default: null },
        name:       { type: String, required: true },
        slug:       String,
        price:      { type: Number, required: true },
        quantity:   { type: Number, required: true },
        image:      String,
      },
    ],
    delivery: {
      fullName: { type: String, required: true },
      email:    { type: String, required: true },
      phone:    { type: String, required: true },
      address:  { type: String, required: true },
      city:     { type: String, required: true },
      postcode: { type: String, required: true },
    },
    subtotal:    { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    codCharge:   { type: Number, default: 0 },
    discount:    { type: Number, default: 0 },
    promoCode:   String,
    total:       { type: Number, required: true },
    status: {
      type:    String,
      enum:    ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type:     String,
      enum:     ["razorpay", "cod"],
      required: true,
    },
    paymentStatus: {
      type:    String,
      enum:    ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    razorpayOrderId:   String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    cancellationReason:  String,
    cancellationComment: String,
    refundId: String,
    refundStatus: {
      type: String,
      enum: ["initiated", "processed", "failed"],
    },
  },
  { timestamps: true }
);

// Core lookup indexes
OrderSchema.index({ userId: 1 });
OrderSchema.index({ "items.vendorId": 1 });
// Compound indexes for common filter combinations
OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ "items.vendorId": 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof OrderSchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const OrderModel =
  (mongoose.models.Order as mongoose.Model<OrderDoc>) ||
  mongoose.model<OrderDoc>("Order", OrderSchema);

export default OrderModel;
