import mongoose, { Schema, type InferSchemaType } from "mongoose";

const WalletSchema = new Schema(
  {
    userId:   { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance:  { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WalletSchema.index({ userId: 1 }, { unique: true });

export type WalletDoc = InferSchemaType<typeof WalletSchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).Wallet;
}

const WalletModel =
  (mongoose.models.Wallet as mongoose.Model<WalletDoc>) ||
  mongoose.model<WalletDoc>("Wallet", WalletSchema);

export default WalletModel;
