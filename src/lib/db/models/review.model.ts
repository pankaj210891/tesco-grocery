import mongoose, { Schema, type Document } from "mongoose";

const ReviewSchema = new Schema(
  {
    productId:   { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productSlug: { type: String, required: true, index: true },
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName:    { type: String, required: true },
    rating:      { type: Number, required: true, min: 1, max: 5 },
    title:       { type: String, required: true, trim: true, maxlength: 120 },
    body:        { type: String, required: true, trim: true, maxlength: 2000 },
    isApproved:  { type: Boolean, default: true },
    helpfulCount:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

// One review per user per product
ReviewSchema.index({ productSlug: 1, userId: 1 }, { unique: true });

export interface IReview extends Document {
  productId:    mongoose.Types.ObjectId;
  productSlug:  string;
  userId:       mongoose.Types.ObjectId;
  userName:     string;
  rating:       number;
  title:        string;
  body:         string;
  isApproved:   boolean;
  helpfulCount: number;
  createdAt:    Date;
  updatedAt:    Date;
}

const Review =
  (mongoose.models.Review as mongoose.Model<IReview>) ??
  mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
