import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VariantSchema = new Schema(
  {
    label:         { type: String, required: true, trim: true },
    sku:           { type: String, default: "" },
    price:         { type: Number, default: null },
    originalPrice: { type: Number, default: null },
    stockQuantity: { type: Number, default: null },
    inStock:       { type: Boolean, default: true },
  },
  { _id: true }
);

const ProductSchema = new Schema(
  {
    name:            { type: String, required: true, trim: true },
    slug:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    description:     { type: String, required: true },
    price:           { type: Number, required: true, min: 0 },
    originalPrice:   { type: Number },
    images:          [String],
    category:        { type: String, required: true },
    subcategory:     { type: String, default: null },
    brand:           { type: String, required: true },
    unit:            { type: String, required: true },
    inStock:         { type: Boolean, default: true },
    stockQuantity:   { type: Number, default: null, min: 0 }, // null = untracked (unlimited)
    lowStockThreshold: { type: Number, default: 5 },
    rating:          { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:     { type: Number, default: 0, min: 0 },
    tags:            [String],
    badge:           { type: String, enum: ["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"], default: null },
    deliveryOptions: { type: [String], enum: ["express", "standard", "collection"], default: ["standard"] },
    // Marketplace: vendor ownership
    vendorId:        { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    vendorName:      { type: String, default: null },
    // Admin approval workflow
    status:          { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    // Dynamic category-specific attributes (e.g. { ram: "8GB", storage: "128GB" })
    // Stored as a Map for O(1) dot-notation queries: { "attributes.ram": "8GB" }
    attributes:      { type: Map, of: String, default: {} },
    // Product variants (e.g. sizes, colours) — empty array means no variants
    variants:        { type: [VariantSchema], default: [] },
  },
  { timestamps: true }
);

// Core filtering indexes
ProductSchema.index({ category: 1 });
ProductSchema.index({ subcategory: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ reviewCount: -1 });
ProductSchema.index({ inStock: 1 });
ProductSchema.index({ vendorId: 1 });
ProductSchema.index({ status: 1 });
// Compound indexes for common filter combinations
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ category: 1, rating: -1 });
ProductSchema.index({ category: 1, brand: 1 });
ProductSchema.index({ vendorId: 1, status: 1 });
ProductSchema.index({ vendorId: 1, createdAt: -1 });
// Dynamic attribute indexes for filterable keys
ProductSchema.index({ "attributes.ram": 1 });
ProductSchema.index({ "attributes.storage": 1 });
ProductSchema.index({ "attributes.battery": 1 });
ProductSchema.index({ "attributes.network": 1 });
ProductSchema.index({ "attributes.processor": 1 });
ProductSchema.index({ "attributes.weight": 1 });
ProductSchema.index({ "attributes.flavor": 1 });
ProductSchema.index({ "attributes.organic": 1 });
// Full-text search
ProductSchema.index({ name: "text", description: "text", brand: "text", tags: "text" });

export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id:               mongoose.Types.ObjectId;
  createdAt:         Date;
  updatedAt:         Date;
  attributes?:       Map<string, string>;
  stockQuantity?:    number | null;
  lowStockThreshold?: number;
};

const ProductModel =
  (mongoose.models.Product as mongoose.Model<ProductDoc>) ||
  mongoose.model<ProductDoc>("Product", ProductSchema);

export default ProductModel;
