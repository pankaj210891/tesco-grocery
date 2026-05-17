import { connectDB } from "@/lib/db/mongoose";
import CategoryModel, { type CategoryDoc } from "@/lib/db/models/category.model";
import type { Category, CategoryNode } from "@/types";

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
    parentId:     doc.parentId ? doc.parentId.toString() : null,
    level:        doc.level ?? 0,
    createdAt:    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : String(doc.createdAt),
  };
}

function buildTree(categories: Category[]): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    nodeMap.set(cat._id, { ...cat, children: [] });
  }

  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
  }

  // Sort children by order
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }
  roots.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  return roots;
}

export async function getAllCategories(): Promise<Category[]> {
  await connectDB();
  const docs = await CategoryModel
    .find({ isActive: true })
    .sort({ order: 1 })
    .lean<CategoryDoc[]>();
  return docs.map(toCategory);
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  await connectDB();
  const docs = await CategoryModel
    .find({ isActive: true })
    .sort({ level: 1, order: 1, name: 1 })
    .lean<CategoryDoc[]>();
  return buildTree(docs.map(toCategory));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  await connectDB();
  const doc = await CategoryModel
    .findOne({ slug, isActive: true })
    .lean<CategoryDoc>();
  return doc ? toCategory(doc) : null;
}
