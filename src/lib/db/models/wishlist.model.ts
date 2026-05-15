import mongoose, { Schema, type InferSchemaType } from "mongoose";

const WishlistSchema = new Schema(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    productIds: [{ type: String }],
  },
  { timestamps: true }
);

export type WishlistDoc = InferSchemaType<typeof WishlistSchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const WishlistModel =
  (mongoose.models.Wishlist as mongoose.Model<WishlistDoc>) ||
  mongoose.model<WishlistDoc>("Wishlist", WishlistSchema);

export default WishlistModel;
