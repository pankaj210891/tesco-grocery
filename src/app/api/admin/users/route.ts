import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import UserModel from "@/lib/db/models/user.model";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit  = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const search = searchParams.get("search") ?? "";
    const role   = searchParams.get("role") ?? "";

    const filter: Record<string, unknown> = {};
    if (role)   filter.role = role;
    if (search) filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: { users, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}
