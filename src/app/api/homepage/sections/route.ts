import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import HomepageSection from "@/lib/db/models/homepage-section.model";

export async function GET() {
  try {
    await connectDB();
    const sections = await HomepageSection
      .find({ isActive: true })
      .sort({ order: 1 })
      .lean();
    return NextResponse.json({ data: sections });
  } catch {
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }
}
