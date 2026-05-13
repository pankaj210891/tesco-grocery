import mongoose, { Schema, type Document } from "mongoose";

const OfferSchema = new Schema(
  {
    title:         { type: String, required: true },
    subtitle:      String,
    description:   String,
    code:          { type: String, uppercase: true, trim: true },

    discountType:  {
      type:     String,
      required: true,
      enum:     ["percentage", "fixed", "freeDelivery"],
    },
    discountValue: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
    expiresAt:     { type: Date, required: true },
    isActive:      { type: Boolean, default: true },

    // ─── Usage limits ──────────────────────────────────────────────────────────
    usageLimit:    { type: Number, default: null },   // null = unlimited total uses
    usedCount:     { type: Number, default: 0 },      // incremented on each order
    perUserLimit:  { type: Number, default: null },   // null = unlimited per user

    // ─── Eligibility restrictions ──────────────────────────────────────────────
    firstOrderOnly:     { type: Boolean, default: false },
    eligibleCategories: [{ type: String }], // [] = all categories
    eligibleProductIds: [{ type: String }], // [] = all products
    eligiblePincodes:   [{ type: String }], // [] = all delivery areas

    // ─── Display metadata ──────────────────────────────────────────────────────
    badge:    String,
    color:    String,
    emoji:    String,
    category: { type: String, default: "all" }, // used for display/navigation only
    href:     { type: String, default: "/" },
    order:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

OfferSchema.index({ code: 1 }, { sparse: true });
OfferSchema.index({ isActive: 1, expiresAt: 1 });

export type DiscountType = "percentage" | "fixed" | "freeDelivery";

export interface IOffer extends Document {
  title:              string;
  subtitle?:          string;
  description?:       string;
  code?:              string;
  discountType:       DiscountType;
  discountValue:      number;
  minOrderValue:      number;
  expiresAt:          Date;
  isActive:           boolean;
  usageLimit:         number | null;
  usedCount:          number;
  perUserLimit:       number | null;
  firstOrderOnly:     boolean;
  eligibleCategories: string[];
  eligibleProductIds: string[];
  eligiblePincodes:   string[];
  badge?:             string;
  color?:             string;
  emoji?:             string;
  category:           string;
  href:               string;
  order:              number;
}

const Offer =
  (mongoose.models.Offer as mongoose.Model<IOffer>) ??
  mongoose.model<IOffer>("Offer", OfferSchema);

export default Offer;
