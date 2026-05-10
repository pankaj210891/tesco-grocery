import mongoose, { Schema, type Document } from "mongoose";

const FaqSchema = new Schema(
  {
    question: { type: String, required: true },
    answer:   { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ["general", "account", "orders", "delivery", "payments", "returns"],
    },
    order:    { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type FaqCategory = "general" | "account" | "orders" | "delivery" | "payments" | "returns";

export interface IFaq extends Document {
  question: string;
  answer:   string;
  category: FaqCategory;
  order:    number;
  isActive: boolean;
}

const Faq =
  (mongoose.models.Faq as mongoose.Model<IFaq>) ??
  mongoose.model<IFaq>("Faq", FaqSchema);

export default Faq;
