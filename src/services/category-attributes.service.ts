import { connectDB } from "@/lib/db/mongoose";
import CategoryAttributesModel, {
  type CategoryAttributesDoc,
} from "@/lib/db/models/category-attributes.model";
import type { CategoryAttributes, AttributeDef } from "@/types";
import type {
  CreateCategoryAttributesInput,
  UpdateCategoryAttributesInput,
} from "@/lib/validations/category-attributes";

// ── Serialiser ────────────────────────────────────────────────────────────────

function toCategory(doc: CategoryAttributesDoc): CategoryAttributes {
  const attrs = (doc.attributes ?? []) as Array<{
    key: string;
    label: string;
    type: string;
    filterable: boolean;
    searchable: boolean;
    required: boolean;
    options: string[];
    order: number;
  }>;

  return {
    _id:        doc._id.toString(),
    category:   doc.category,
    label:      doc.label,
    isActive:   doc.isActive ?? true,
    attributes: attrs.map((a) => ({
      key:        a.key,
      label:      a.label,
      type:       a.type as AttributeDef["type"],
      filterable: a.filterable ?? true,
      searchable: a.searchable ?? false,
      required:   a.required ?? false,
      options:    (a.options ?? []) as string[],
      order:      a.order ?? 0,
    })),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

// ── CRUD operations ───────────────────────────────────────────────────────────

export async function listCategoryAttributes(): Promise<CategoryAttributes[]> {
  await connectDB();
  const docs = await CategoryAttributesModel
    .find({})
    .sort({ category: 1 })
    .lean<CategoryAttributesDoc[]>();
  return docs.map(toCategory);
}

export async function getActiveCategoryAttributes(): Promise<CategoryAttributes[]> {
  await connectDB();
  const docs = await CategoryAttributesModel
    .find({ isActive: true })
    .sort({ category: 1 })
    .lean<CategoryAttributesDoc[]>();
  return docs.map(toCategory);
}

export async function getCategoryAttributesBySlug(
  category: string,
): Promise<CategoryAttributes | null> {
  await connectDB();
  const doc = await CategoryAttributesModel
    .findOne({ category: category.toLowerCase() })
    .lean<CategoryAttributesDoc>();
  return doc ? toCategory(doc) : null;
}

export async function createCategoryAttributes(
  input: CreateCategoryAttributesInput,
  userId?: string,
): Promise<CategoryAttributes> {
  await connectDB();
  const doc = await CategoryAttributesModel.create({
    ...input,
    category:  input.category.toLowerCase(),
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  return toCategory(doc.toObject() as CategoryAttributesDoc);
}

export async function updateCategoryAttributes(
  id: string,
  input: UpdateCategoryAttributesInput,
  userId?: string,
): Promise<CategoryAttributes | null> {
  await connectDB();
  const doc = await CategoryAttributesModel
    .findByIdAndUpdate(
      id,
      { ...input, updatedBy: userId ?? null },
      { new: true, runValidators: true },
    )
    .lean<CategoryAttributesDoc>();
  return doc ? toCategory(doc) : null;
}

export async function deleteCategoryAttributes(id: string): Promise<boolean> {
  await connectDB();
  const res = await CategoryAttributesModel.findByIdAndDelete(id);
  return res !== null;
}

// ── Utility — fetch filterable attr defs for a category ───────────────────────

export async function getFilterableAttrs(
  category: string,
): Promise<CategoryAttributes["attributes"]> {
  const schema = await getCategoryAttributesBySlug(category);
  if (!schema) return [];
  return schema.attributes.filter((a) => a.filterable);
}
