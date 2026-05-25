import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import HomepageSection from "@/lib/db/models/homepage-section.model";
import { withCache } from "@/lib/redis/cache";
import { CacheKey, TTL } from "@/lib/redis/keys";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    // Only cache the unfiltered (all active sections) request — it is the
    // common case and accounts for the majority of homepage loads.
    if (!type) {
      const sections = await withCache(CacheKey.homepageSections(), TTL.MEDIUM, async () => {
        await connectDB();
        return HomepageSection.find({ isActive: true }).sort({ order: 1 }).lean();
      });
      return NextResponse.json({ data: sections });
    }

    await connectDB();
    const sections = await HomepageSection
      .find({ isActive: true, type })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ data: sections });
  } catch {
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }
}
