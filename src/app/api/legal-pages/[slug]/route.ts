import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import LegalPage from "@/lib/db/models/legal-page.model";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (slug !== "terms" && slug !== "privacy") {
      return NextResponse.json({ success: false, error: "Invalid page" }, { status: 400 });
    }

    await connectDB();
    const page = await LegalPage.findOne({ slug, isPublished: true }).lean();
    if (!page) {
      return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: page });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch page" }, { status: 500 });
  }
}
