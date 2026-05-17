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
    parentId:     { type: Schema.Types.ObjectId, ref: "Category", default: null },
    level:        { type: Number, default: 0, min: 0, max: 2 },
  },
  { timestamps: true }
);

CategorySchema.index({ order: 1 });
CategorySchema.index({ parentId: 1, level: 1 });

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

// Delete cached model in development so schema changes are always picked up
// after hot-module reloads (avoids Mongoose strict-mode silently dropping new fields).
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.Category;
}

const CategoryModel =
  (mongoose.models.Category as mongoose.Model<CategoryDoc>) ||
  mongoose.model<CategoryDoc>("Category", CategorySchema);

export default CategoryModel;
