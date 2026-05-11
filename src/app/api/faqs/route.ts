import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Faq from "@/lib/db/models/faq.model";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search   = searchParams.get("search");

    const filter: Record<string, unknown> = { isActive: true };
    if (category && category !== "all") filter.category = category;
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer:   { $regex: search, $options: "i" } },
      ];
    }

    const faqs = await Faq.find(filter).sort({ category: 1, order: 1 }).lean();
    return NextResponse.json({ success: true, data: faqs });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch FAQs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const faq  = await Faq.create(body);
    return NextResponse.json({ success: true, data: faq }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create FAQ";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
