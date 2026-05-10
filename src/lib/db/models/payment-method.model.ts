import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PaymentMethodSchema = new Schema(
  {
    userId:          { type: Schema.Types.ObjectId, ref: "User", required: true },
    cardType:        { type: String, enum: ["visa", "mastercard", "amex", "discover", "other"], required: true },
    lastFour:        { type: String, required: true, length: 4 },
    expiryMonth:     { type: String, required: true },
    expiryYear:      { type: String, required: true },
    cardholderName:  { type: String, required: true, trim: true },
    isDefault:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

PaymentMethodSchema.index({ userId: 1 });

export type PaymentMethodDoc = InferSchemaType<typeof PaymentMethodSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const PaymentMethodModel =
  (mongoose.models.PaymentMethod as mongoose.Model<PaymentMethodDoc>) ||
  mongoose.model<PaymentMethodDoc>("PaymentMethod", PaymentMethodSchema);

export default PaymentMethodModel;
