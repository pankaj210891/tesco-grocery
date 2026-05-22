import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import DietaryOptionModel from "@/lib/db/models/dietary-option.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

const CreateSchema = z.object({
  value:    z.string().min(1).max(60).toLowerCase().trim()
             .regex(/^[a-z0-9-]+$/, "value must be lowercase alphanumeric with hyphens"),
  label:    z.string().min(1).max(80).trim(),
  emoji:    z.string().max(10).default("🥗"),
  isActive: z.boolean().default(true),
  order:    z.number().int().min(0).default(0),
});

// GET /api/admin/dietary-options — list all (active + inactive)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const sp     = req.nextUrl.searchParams;
  const search = sp.get("q")?.trim() ?? "";
  const active = sp.get("isActive");

  const query: Record<string, unknown> = {};
  if (search) query.label = { $regex: search, $options: "i" };
  if (active === "true")  query.isActive = true;
  if (active === "false") query.isActive = false;

  const docs = await DietaryOptionModel.find(query).sort({ order: 1, label: 1 }).lean();
  return NextResponse.json({ success: true, data: docs });
}

// POST /api/admin/dietary-options — create
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
    const doc = await DietaryOptionModel.create(parsed.data);
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err: unknown) {
    const isDupe = (err as { code?: number })?.code === 11000;
    return NextResponse.json(
      { success: false, error: isDupe ? "A dietary option with that value already exists." : "Failed to create option." },
      { status: 400 }
    );
  }
}
