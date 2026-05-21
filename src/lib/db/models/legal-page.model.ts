import mongoose, { Schema, type Document } from "mongoose";

export type LegalPageSlug = "terms" | "privacy";
export type ContentBlockType =
  | "paragraph"
  | "bulletList"
  | "numberedList"
  | "subheading"
  | "highlight";

export interface IContentBlock {
  type: ContentBlockType;
  text?: string;
  items?: string[];
}

export interface ILegalSection {
  id: string;
  title: string;
  order: number;
  blocks: IContentBlock[];
}

export interface ILegalPage extends Document {
  slug: LegalPageSlug;
  title: string;
  introText: string;
  lastUpdated: Date;
  effectiveDate: Date;
  version: string;
  isPublished: boolean;
  sections: ILegalSection[];
}

const ContentBlockSchema = new Schema<IContentBlock>(
  {
    type:  { type: String, required: true, enum: ["paragraph", "bulletList", "numberedList", "subheading", "highlight"] },
    text:  { type: String },
    items: { type: [String], default: undefined },
  },
  { _id: false }
);

const LegalSectionSchema = new Schema<ILegalSection>(
  {
    id:     { type: String, required: true },
    title:  { type: String, required: true },
    order:  { type: Number, required: true, default: 0 },
    blocks: { type: [ContentBlockSchema], default: [] },
  },
  { _id: false }
);

const LegalPageSchema = new Schema<ILegalPage>(
  {
    slug:          { type: String, required: true, unique: true, enum: ["terms", "privacy"] },
    title:         { type: String, required: true },
    introText:     { type: String, required: true },
    lastUpdated:   { type: Date, required: true },
    effectiveDate: { type: Date, required: true },
    version:       { type: String, required: true, default: "1.0" },
    isPublished:   { type: Boolean, default: true },
    sections:      { type: [LegalSectionSchema], default: [] },
  },
  { timestamps: true }
);

const LegalPage =
  (mongoose.models.LegalPage as mongoose.Model<ILegalPage>) ??
  mongoose.model<ILegalPage>("LegalPage", LegalPageSchema);

export default LegalPage;
