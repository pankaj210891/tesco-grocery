import mongoose, { Schema, type Document } from "mongoose";

const SectionItemSchema = new Schema(
  {
    title:         { type: String, required: true },
    subtitle:      String,
    description:   String,
    emoji:         String,
    href:          { type: String, required: true },
    badge:         String,
    price:         Number,
    originalPrice: Number,
    discount:      Number,
    brand:         String,
    color:         String,
    expiresAt:     Date,
    order:         { type: Number, default: 0 },
  },
  { _id: true }
);

const HomepageSectionSchema = new Schema(
  {
    key:      { type: String, required: true, unique: true },
    title:    { type: String, required: true },
    subtitle: String,
    type: {
      type: String,
      required: true,
      enum: [
        "product-carousel",
        "offer-cards",
        "brand-inspiration",
        "info-cards",
        "category-tiles",
        "brand-grid",
        "explore-cards",
      ],
    },
    isActive: { type: Boolean, default: true },
    order:    { type: Number, default: 0 },
    items:    [SectionItemSchema],
    ctaLabel: String,
    ctaHref:  String,
  },
  { timestamps: true }
);

export interface IHomepageSection extends Document {
  key:       string;
  title:     string;
  subtitle?: string;
  type:      string;
  isActive:  boolean;
  order:     number;
  items: Array<{
    _id:            mongoose.Types.ObjectId;
    title:          string;
    subtitle?:      string;
    description?:   string;
    emoji?:         string;
    href:           string;
    badge?:         string;
    price?:         number;
    originalPrice?: number;
    discount?:      number;
    brand?:         string;
    color?:         string;
    expiresAt?:     Date;
    order:          number;
  }>;
  ctaLabel?: string;
  ctaHref?:  string;
}

const HomepageSection =
  (mongoose.models.HomepageSection as mongoose.Model<IHomepageSection>) ??
  mongoose.model<IHomepageSection>("HomepageSection", HomepageSectionSchema);

export default HomepageSection;
