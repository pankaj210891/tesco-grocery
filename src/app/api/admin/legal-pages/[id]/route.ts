import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import LegalPage from "@/lib/db/models/legal-page.model";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { UpdateLegalPageSchema } from "@/lib/validations/legal-page";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await connectDB();
    const page = await LegalPage.findById(id).lean();
    if (!page) {
      return NextResponse.json({ success: false, error: "Legal page not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: page });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch legal page" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await connectDB();
    const body = await req.json();
    const parsed = UpdateLegalPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const page = await LegalPage.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean();

    if (!page) {
      return NextResponse.json({ success: false, error: "Legal page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: page });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update legal page";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await connectDB();
    const page = await LegalPage.findByIdAndDelete(id).lean();
    if (!page) {
      return NextResponse.json({ success: false, error: "Legal page not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Legal page deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete legal page" }, { status: 500 });
  }
}
