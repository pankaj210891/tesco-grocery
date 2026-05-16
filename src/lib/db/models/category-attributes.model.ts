import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const ATTRIBUTE_TYPES = ["text", "select", "multiselect", "boolean", "number"] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

const AttributeDefSchema = new Schema(
  {
    key:          { type: String, required: true, trim: true, lowercase: true },
    label:        { type: String, required: true, trim: true },
    type:         { type: String, enum: ATTRIBUTE_TYPES, required: true },
    filterable:   { type: Boolean, default: true },
    searchable:   { type: Boolean, default: false },
    required:     { type: Boolean, default: false },
    // Predefined options for select/multiselect types
    options:      { type: [String], default: [] },
    order:        { type: Number, default: 0 },
  },
  { _id: false }
);

const CategoryAttributesSchema = new Schema(
  {
    // Category slug (e.g. "mobiles", "oats") — must be unique per category
    category:   { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Human-readable label for the category
    label:      { type: String, required: true, trim: true },
    attributes: { type: [AttributeDefSchema], default: [] },
    isActive:   { type: Boolean, default: true },
    createdBy:  { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy:  { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

CategoryAttributesSchema.index({ category: 1 });
CategoryAttributesSchema.index({ isActive: 1 });

export type AttributeDefDoc   = InferSchemaType<typeof AttributeDefSchema>;
export type CategoryAttributesDoc = InferSchemaType<typeof CategoryAttributesSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const CategoryAttributesModel =
  (mongoose.models.CategoryAttributes as mongoose.Model<CategoryAttributesDoc>) ||
  mongoose.model<CategoryAttributesDoc>("CategoryAttributes", CategoryAttributesSchema);

export default CategoryAttributesModel;
