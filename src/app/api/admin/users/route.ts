import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import UserModel from "@/lib/db/models/user.model";
import { AdminUserQuerySchema } from "@/lib/validations/admin-filters";
import {
  decodeCursor,
  findKeyset,
  COMMON_SORT_CONFIGS,
  type SortConfig,
} from "@/lib/pagination/keyset";

const SORT_MAP: Record<string, SortConfig> = {
  newest:      COMMON_SORT_CONFIGS.newest,
  oldest:      COMMON_SORT_CONFIGS.oldest,
  "name-asc":  COMMON_SORT_CONFIGS["name-asc"],
  "name-desc": COMMON_SORT_CONFIGS["name-desc"],
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

  const { page, limit, cursor: rawCursor, search, role, status, dateFrom, dateTo, sortBy } = parsed.data;

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

    const sortCfg = SORT_MAP[sortBy] ?? SORT_MAP.newest;

    // ── Keyset mode ───────────────────────────────────────────────────────────
    const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

    if (cursorObj) {
      const { docs, nextCursor, hasMore } = await findKeyset({
        model:      UserModel,
        filter,
        cursor:     cursorObj,
        limit,
        projection: { password: 0 },
      });

      return NextResponse.json({
        success: true,
        data: { users: docs, nextCursor, hasMore },
      });
    }

    // ── Offset mode (backward compatible) ─────────────────────────────────────
    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("-password")
        .sort(sortCfg.sort)
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
