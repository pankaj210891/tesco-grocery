import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import HomepageSection from "@/lib/db/models/homepage-section.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

const SECTION_TYPES = [
  "product-carousel", "offer-cards", "brand-inspiration", "info-cards",
  "category-tiles", "brand-grid", "explore-cards", "hero-banner",
] as const;

const UpdateSchema = z.object({
  key:      z.string().min(1).max(100).trim()
             .regex(/^[a-z0-9-]+$/, "key must be lowercase letters, numbers and hyphens").optional(),
  title:    z.string().min(1).max(200).trim().optional(),
  subtitle: z.string().max(300).trim().optional(),
  type:     z.enum(SECTION_TYPES).optional(),
  isActive: z.boolean().optional(),
  order:    z.number().int().min(0).optional(),
  ctaLabel: z.string().max(100).trim().optional(),
  ctaHref:  z.string().max(500).trim().optional(),
});

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// PATCH /api/admin/homepage-sections/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    const updated = await HomepageSection.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const isDupe = (err as { code?: number })?.code === 11000;
    return NextResponse.json(
      { success: false, error: isDupe ? "A section with that key already exists." : "Failed to update section." },
      { status: 400 }
    );
  }
}

// DELETE /api/admin/homepage-sections/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  await connectDB();

  const deleted = await HomepageSection.findByIdAndDelete(id).lean();
  if (!deleted) {
    return NextResponse.json({ success: false, error: "Section not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Section deleted." });
}
