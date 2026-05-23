import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DietaryOptionSchema = new Schema(
  {
    value:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    label:    { type: String, required: true, trim: true },
    emoji:    { type: String, default: "🥗" },
    isActive: { type: Boolean, default: true },
    order:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

DietaryOptionSchema.index({ isActive: 1, order: 1 });

export type DietaryOptionDoc = InferSchemaType<typeof DietaryOptionSchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).DietaryOption;
}

const DietaryOptionModel =
  (mongoose.models.DietaryOption as mongoose.Model<DietaryOptionDoc>) ||
  mongoose.model<DietaryOptionDoc>("DietaryOption", DietaryOptionSchema);

export default DietaryOptionModel;
