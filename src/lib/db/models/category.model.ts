import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CategorySchema = new Schema(
  {
    name:         { type: String, required: true, unique: true, trim: true },
    slug:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    emoji:        { type: String, default: "📦" },
    image:        { type: String, default: "" },
    description:  { type: String, default: "" },
    color:        { type: String, default: "bg-gray-50" },
    textColor:    { type: String, default: "text-gray-700" },
    order:        { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.index({ slug: 1 });
CategorySchema.index({ order: 1 });

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const CategoryModel =
  (mongoose.models.Category as mongoose.Model<CategoryDoc>) ||
  mongoose.model<CategoryDoc>("Category", CategorySchema);

export default CategoryModel;
