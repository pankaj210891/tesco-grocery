import mongoose, { Schema, type Document } from "mongoose";

const OfferSchema = new Schema(
  {
    title:         { type: String, required: true },
    subtitle:      String,
    description:   String,
    code:          String,
    discountType:  {
      type: String,
      required: true,
      enum: ["percentage", "fixed", "freeDelivery"],
    },
    discountValue: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
    expiresAt:     { type: Date, required: true },
    isActive:      { type: Boolean, default: true },
    badge:         String,
    color:         String,
    emoji:         String,
    category:      { type: String, default: "all" },
    href:          { type: String, default: "/" },
    order:         { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type DiscountType = "percentage" | "fixed" | "freeDelivery";

export interface IOffer extends Document {
  title:         string;
  subtitle?:     string;
  description?:  string;
  code?:         string;
  discountType:  DiscountType;
  discountValue: number;
  minOrderValue: number;
  expiresAt:     Date;
  isActive:      boolean;
  badge?:        string;
  color?:        string;
  emoji?:        string;
  category:      string;
  href:          string;
  order:         number;
}

const Offer =
  (mongoose.models.Offer as mongoose.Model<IOffer>) ??
  mongoose.model<IOffer>("Offer", OfferSchema);

export default Offer;
