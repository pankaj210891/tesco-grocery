import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import HomepageSection from "@/lib/db/models/homepage-section.model";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    await connectDB();

    const query: Record<string, unknown> = { isActive: true };
    if (type) query.type = type;

    const sections = await HomepageSection
      .find(query)
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ data: sections });
  } catch {
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }
}
