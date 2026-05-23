import mongoose, { Schema, type InferSchemaType } from "mongoose";

/**
 * credit  — money added to the wallet (topup, refund, admin credit)
 * debit   — money deducted from the wallet (order payment, admin debit)
 */
const WalletTransactionSchema = new Schema(
  {
    walletId:    { type: Schema.Types.ObjectId, ref: "Wallet",  required: true },
    userId:      { type: Schema.Types.ObjectId, ref: "User",    required: true },
    type:        { type: String, enum: ["credit", "debit"],     required: true },
    amount:      { type: Number, required: true, min: 0.01 },
    balanceAfter:{ type: Number, required: true, min: 0 },
    // Reason codes for auditability
    reason: {
      type: String,
      enum: ["topup", "order_payment", "refund", "admin_credit", "admin_debit"],
      required: true,
    },
    description: { type: String, trim: true, default: "" },
    // Reference to the related order (if applicable)
    orderId:     { type: Schema.Types.ObjectId, ref: "Order", default: null },
    orderNumber: { type: String, default: null },
    // Admin who performed the action (for admin_credit / admin_debit)
    performedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status:      { type: String, enum: ["completed", "failed"], default: "completed" },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ orderId: 1 });

export type WalletTransactionDoc = InferSchemaType<typeof WalletTransactionSchema> & {
  _id:       mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).WalletTransaction;
}

const WalletTransactionModel =
  (mongoose.models.WalletTransaction as mongoose.Model<WalletTransactionDoc>) ||
  mongoose.model<WalletTransactionDoc>("WalletTransaction", WalletTransactionSchema);

export default WalletTransactionModel;
