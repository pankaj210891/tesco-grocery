import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import HomepageSection from "@/lib/db/models/homepage-section.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

const SECTION_TYPES = [
  "product-carousel", "offer-cards", "brand-inspiration", "info-cards",
  "category-tiles", "brand-grid", "explore-cards", "hero-banner",
] as const;

const CreateSchema = z.object({
  key:      z.string().min(1).max(100).trim()
             .regex(/^[a-z0-9-]+$/, "key must be lowercase letters, numbers and hyphens"),
  title:    z.string().min(1).max(200).trim(),
  subtitle: z.string().max(300).trim().optional(),
  type:     z.enum(SECTION_TYPES),
  isActive: z.boolean().default(true),
  order:    z.number().int().min(0).default(0),
  ctaLabel: z.string().max(100).trim().optional(),
  ctaHref:  z.string().max(500).trim().optional(),
});

// GET /api/admin/homepage-sections — all sections (active + inactive)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const sections = await HomepageSection.find({}).sort({ order: 1 }).lean();
  return NextResponse.json({ success: true, data: sections });
}

// POST /api/admin/homepage-sections — create new section
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    const doc = await HomepageSection.create({ ...parsed.data, items: [] });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err: unknown) {
    const isDupe = (err as { code?: number })?.code === 11000;
    return NextResponse.json(
      { success: false, error: isDupe ? "A section with that key already exists." : "Failed to create section." },
      { status: 400 }
    );
  }
}
