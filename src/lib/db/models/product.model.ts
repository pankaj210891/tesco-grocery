import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ProductSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    description:   { type: String, required: true },
    price:         { type: Number, required: true, min: 0 },
    originalPrice: { type: Number },
    images:        [String],
    category:      { type: String, required: true },
    brand:         { type: String, required: true },
    unit:          { type: String, required: true },
    inStock:       { type: Boolean, default: true },
    rating:        { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:   { type: Number, default: 0, min: 0 },
    tags:          [String],
    badge:         { type: String, enum: ["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"], default: null },
    vendorId:      { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    vendorName:    { type: String, default: null },
  },
  { timestamps: true }
);

ProductSchema.index({ category: 1 });
ProductSchema.index({ name: "text", description: "text", brand: "text", tags: "text" });

export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const ProductModel =
  (mongoose.models.Product as mongoose.Model<ProductDoc>) ||
  mongoose.model<ProductDoc>("Product", ProductSchema);

export default ProductModel;
