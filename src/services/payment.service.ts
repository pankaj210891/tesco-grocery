import { connectDB } from "@/lib/db/mongoose";
import PaymentMethodModel, { type PaymentMethodDoc } from "@/lib/db/models/payment-method.model";
import type { PaymentMethod, CardType } from "@/types";

function toPaymentMethod(doc: PaymentMethodDoc): PaymentMethod {
  return {
    _id:            doc._id.toString(),
    userId:         doc.userId.toString(),
    cardType:       doc.cardType as CardType,
    lastFour:       doc.lastFour,
    expiryMonth:    doc.expiryMonth,
    expiryYear:     doc.expiryYear,
    cardholderName: doc.cardholderName,
    isDefault:      doc.isDefault,
    createdAt:      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  await connectDB();
  const docs = await PaymentMethodModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean<PaymentMethodDoc[]>();
  return docs.map(toPaymentMethod);
}

export async function savePaymentMethod(
  userId: string,
  data: Omit<PaymentMethod, "_id" | "userId" | "createdAt">
): Promise<PaymentMethod> {
  await connectDB();
  if (data.isDefault) {
    await PaymentMethodModel.updateMany({ userId }, { $set: { isDefault: false } });
  }
  const doc = await PaymentMethodModel.create({ ...data, userId });
  return toPaymentMethod(doc.toObject() as PaymentMethodDoc);
}

export async function deletePaymentMethod(userId: string, paymentId: string): Promise<boolean> {
  await connectDB();
  const result = await PaymentMethodModel.deleteOne({ _id: paymentId, userId });
  return result.deletedCount > 0;
}

export async function setDefaultPaymentMethod(
  userId: string,
  paymentId: string
): Promise<PaymentMethod | null> {
  await connectDB();
  await PaymentMethodModel.updateMany({ userId }, { $set: { isDefault: false } });
  const doc = await PaymentMethodModel.findOneAndUpdate(
    { _id: paymentId, userId },
    { $set: { isDefault: true } },
    { new: true }
  ).lean<PaymentMethodDoc>();
  return doc ? toPaymentMethod(doc) : null;
}
