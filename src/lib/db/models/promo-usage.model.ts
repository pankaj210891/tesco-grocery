import mongoose, { Schema, type Document } from "mongoose";

export interface IPromoUsage extends Document {
  promoId:        mongoose.Types.ObjectId;
  promoCode:      string;
  userId:         string;
  orderId:        string;
  discountAmount: number;
  createdAt:      Date;
}

const PromoUsageSchema = new Schema(
  {
    promoId:        { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    promoCode:      { type: String, required: true, uppercase: true, trim: true },
    userId:         { type: String, required: true },
    orderId:        { type: String, required: true },
    discountAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

PromoUsageSchema.index({ promoCode: 1 });
PromoUsageSchema.index({ promoCode: 1, userId: 1 });
PromoUsageSchema.index({ orderId: 1 }, { unique: true, sparse: true });

const PromoUsageModel =
  (mongoose.models.PromoUsage as mongoose.Model<IPromoUsage>) ??
  mongoose.model<IPromoUsage>("PromoUsage", PromoUsageSchema);

export default PromoUsageModel;
