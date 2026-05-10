import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Store from "@/lib/db/models/store.model";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const city    = searchParams.get("city");
    const search  = searchParams.get("search");

    const filter: Record<string, unknown> = { isActive: true };
    if (city)   filter.city = { $regex: city, $options: "i" };
    if (search) {
      filter.$or = [
        { name:     { $regex: search, $options: "i" } },
        { city:     { $regex: search, $options: "i" } },
        { postcode: { $regex: search, $options: "i" } },
        { address:  { $regex: search, $options: "i" } },
      ];
    }

    const stores = await Store.find(filter).sort({ city: 1, name: 1 }).lean();
    return NextResponse.json({ success: true, data: stores });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch stores" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const store = await Store.create(body);
    return NextResponse.json({ success: true, data: store }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create store";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
