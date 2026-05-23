import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import DietaryOptionModel from "@/lib/db/models/dietary-option.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

const SEED_OPTIONS = [
  { value: "coeliac",     label: "Coeliac",     emoji: "🌾", order: 0 },
  { value: "diabetic",    label: "Diabetic",    emoji: "🩺", order: 1 },
  { value: "paleo",       label: "Paleo",       emoji: "🥩", order: 2 },
  { value: "pescatarian", label: "Pescatarian", emoji: "🐟", order: 3 },
  { value: "teetotal",    label: "Teetotal",    emoji: "🚱", order: 4 },
  { value: "vegan",       label: "Vegan",       emoji: "🌿", order: 5 },
  { value: "vegetarian",  label: "Vegetarian",  emoji: "🥦", order: 6 },
];

// POST /api/admin/dietary-options/seed
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  let inserted = 0;
  let skipped  = 0;

  for (const opt of SEED_OPTIONS) {
    const exists = await DietaryOptionModel.exists({ value: opt.value });
    if (exists) { skipped++; continue; }
    await DietaryOptionModel.create({ ...opt, isActive: true });
    inserted++;
  }

  return NextResponse.json({
    success: true,
    message: `Seeded ${inserted} option(s). Skipped ${skipped} existing.`,
    inserted,
    skipped,
  });
}
