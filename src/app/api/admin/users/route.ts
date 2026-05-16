import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import UserModel from "@/lib/db/models/user.model";
import { AdminUserQuerySchema } from "@/lib/validations/admin-filters";

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  newest:       { createdAt: -1 },
  oldest:       { createdAt: 1 },
  "name-asc":   { name: 1 },
  "name-desc":  { name: -1 },
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = AdminUserQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { page, limit, search, role, status, dateFrom, dateTo, sortBy } = parsed.data;

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};

    if (role)   filter.role = role;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo)   dateFilter.$lte = new Date(`${dateTo}T23:59:59.999Z`);
      filter.createdAt = dateFilter;
    }

    const sort = SORT_MAP[sortBy] ?? { createdAt: -1 };

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("-password")
        .sort(sort)
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
