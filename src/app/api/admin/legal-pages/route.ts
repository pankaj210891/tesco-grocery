import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import LegalPage from "@/lib/db/models/legal-page.model";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { CreateLegalPageSchema } from "@/lib/validations/legal-page";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const pages = await LegalPage.find({}).sort({ slug: 1 }).lean();
    return NextResponse.json({ success: true, data: pages });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch legal pages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json();
    const parsed = CreateLegalPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await LegalPage.findOne({ slug: parsed.data.slug });
    if (existing) {
      return NextResponse.json({ success: false, error: "A legal page with this slug already exists" }, { status: 409 });
    }

    const page = await LegalPage.create(parsed.data);
    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create legal page";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
