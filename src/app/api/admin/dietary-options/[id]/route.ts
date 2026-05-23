import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import DietaryOptionModel from "@/lib/db/models/dietary-option.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

const UpdateSchema = z.object({
  value:    z.string().min(1).max(60).toLowerCase().trim()
             .regex(/^[a-z0-9-]+$/, "value must be lowercase alphanumeric with hyphens").optional(),
  label:    z.string().min(1).max(80).trim().optional(),
  emoji:    z.string().max(10).optional(),
  isActive: z.boolean().optional(),
  order:    z.number().int().min(0).optional(),
});

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// PUT /api/admin/dietary-options/[id]
export async function PUT(
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
    const updated = await DietaryOptionModel.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Dietary option not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const isDupe = (err as { code?: number })?.code === 11000;
    return NextResponse.json(
      { success: false, error: isDupe ? "That value is already used by another option." : "Failed to update option." },
      { status: 400 }
    );
  }
}

// DELETE /api/admin/dietary-options/[id]
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

  const deleted = await DietaryOptionModel.findByIdAndDelete(id).lean();
  if (!deleted) {
    return NextResponse.json({ success: false, error: "Dietary option not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Dietary option deleted." });
}
