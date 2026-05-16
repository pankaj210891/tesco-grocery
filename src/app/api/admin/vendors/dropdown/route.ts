import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";

// Lightweight endpoint — returns only _id, name, slug for active vendors.
// Used by the Add/Edit Product form vendor selector.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q     = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const page  = Math.max(1, Number(searchParams.get("page") ?? 1));

    const filter: Record<string, unknown> = { status: "active" };
    if (q) {
      filter.$or = [
        { name:  { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      VendorModel.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("_id name slug")
        .lean(),
      VendorModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: { vendors, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch vendors" }, { status: 500 });
  }
}
