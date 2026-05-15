import { connectDB } from "@/lib/db/mongoose";
import CategoryModel, { type CategoryDoc } from "@/lib/db/models/category.model";
import type { Category } from "@/types";

function toCategory(doc: CategoryDoc & { _id: { toString(): string } }): Category {
  return {
    _id:          doc._id.toString(),
    name:         doc.name,
    slug:         doc.slug,
    emoji:        doc.emoji ?? "📦",
    image:        (doc as CategoryDoc & { image?: string }).image ?? "",
    description:  doc.description ?? "",
    color:        doc.color ?? "bg-gray-50",
    textColor:    doc.textColor ?? "text-gray-700",
    order:        doc.order ?? 0,
    isActive:     doc.isActive ?? true,
    productCount: doc.productCount ?? 0,
    createdAt:    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : String(doc.createdAt),
  };
}

export async function getAllCategories(): Promise<Category[]> {
  await connectDB();
  const docs = await CategoryModel
    .find({ isActive: true })
    .sort({ order: 1 })
    .lean<CategoryDoc[]>();
  return docs.map(toCategory);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  await connectDB();
  const doc = await CategoryModel
    .findOne({ slug, isActive: true })
    .lean<CategoryDoc>();
  return doc ? toCategory(doc) : null;
}
