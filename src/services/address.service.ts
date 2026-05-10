import { connectDB } from "@/lib/db/mongoose";
import AddressModel, { type AddressDoc } from "@/lib/db/models/address.model";
import type { Address } from "@/types";

function toAddress(doc: AddressDoc): Address {
  return {
    _id:         doc._id.toString(),
    userId:      doc.userId.toString(),
    label:       doc.label as Address["label"],
    customLabel: doc.customLabel ?? undefined,
    fullName:    doc.fullName,
    phone:       doc.phone,
    line1:       doc.line1,
    line2:       doc.line2 ?? undefined,
    city:        doc.city,
    postcode:    doc.postcode,
    country:     doc.country,
    isDefault:   doc.isDefault,
    createdAt:   doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export async function getAddresses(userId: string): Promise<Address[]> {
  await connectDB();
  const docs = await AddressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean<AddressDoc[]>();
  return docs.map(toAddress);
}

export async function createAddress(
  userId: string,
  data: Omit<Address, "_id" | "userId" | "createdAt">
): Promise<Address> {
  await connectDB();
  if (data.isDefault) {
    await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
  }
  const doc = await AddressModel.create({ ...data, userId });
  return toAddress(doc.toObject() as AddressDoc);
}

export async function updateAddress(
  userId: string,
  addressId: string,
  data: Partial<Omit<Address, "_id" | "userId" | "createdAt">>
): Promise<Address | null> {
  await connectDB();
  if (data.isDefault) {
    await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
  }
  const doc = await AddressModel.findOneAndUpdate(
    { _id: addressId, userId },
    { $set: data },
    { new: true }
  ).lean<AddressDoc>();
  return doc ? toAddress(doc) : null;
}

export async function deleteAddress(userId: string, addressId: string): Promise<boolean> {
  await connectDB();
  const result = await AddressModel.deleteOne({ _id: addressId, userId });
  return result.deletedCount > 0;
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<Address | null> {
  await connectDB();
  await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
  const doc = await AddressModel.findOneAndUpdate(
    { _id: addressId, userId },
    { $set: { isDefault: true } },
    { new: true }
  ).lean<AddressDoc>();
  return doc ? toAddress(doc) : null;
}
