import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CartItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    quantity:  { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const SavedItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    savedAt:   { type: Date, default: Date.now },
  },
  { _id: false }
);

const CartSchema = new Schema(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items:      [CartItemSchema],
    savedItems: { type: [SavedItemSchema], default: [] },
  },
  { timestamps: true }
);

CartSchema.index({ "items.productId": 1 });
CartSchema.index({ "savedItems.productId": 1 });

export type CartDoc = InferSchemaType<typeof CartSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const CartModel =
  (mongoose.models.Cart as mongoose.Model<CartDoc>) ||
  mongoose.model<CartDoc>("Cart", CartSchema);

export default CartModel;
