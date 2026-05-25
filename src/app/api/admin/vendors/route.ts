import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";
import { AdminVendorQuerySchema } from "@/lib/validations/admin-filters";
import { decodeCursor, findKeyset, COMMON_SORT_CONFIGS } from "@/lib/pagination/keyset";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = AdminVendorQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { page, limit, cursor: rawCursor, q, status, dateFrom, dateTo } = parsed.data;

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { name:  { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { city:  { $regex: q, $options: "i" } },
      ];
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo)   dateFilter.$lte = new Date(`${dateTo}T23:59:59.999Z`);
      filter.createdAt = dateFilter;
    }

    // ── Keyset mode ───────────────────────────────────────────────────────────
    const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

    if (cursorObj) {
      const { docs, nextCursor, hasMore } = await findKeyset({
        model:  VendorModel,
        filter,
        cursor: cursorObj,
        limit,
      });

      return NextResponse.json({
        success: true,
        data: { vendors: docs, nextCursor, hasMore },
      });
    }

    // ── Offset mode (backward compatible) ─────────────────────────────────────
    const [vendors, total] = await Promise.all([
      VendorModel.find(filter)
        .sort(COMMON_SORT_CONFIGS.newest.sort)
        .skip((page - 1) * limit)
        .limit(limit)
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

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json() as Record<string, unknown>;
    const { name, slug, description, logo, email, phone, address, city, status, ownerId, ownerName } = body;

    if (!name || !slug || !email || !ownerId || !ownerName) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 422 });
    }

    const normalizedEmail = (email as string).toLowerCase().trim();

    const existingByEmail = await VendorModel.findOne({ email: normalizedEmail }).lean();
    if (existingByEmail) {
      return NextResponse.json(
        { success: false, error: "A vendor store with this email address already exists." },
        { status: 409 }
      );
    }

    const existingByName = await VendorModel.findOne({
      name: { $regex: `^${escapeRegex(name as string)}$`, $options: "i" },
    }).lean();
    if (existingByName) {
      return NextResponse.json(
        { success: false, error: "A vendor store with this name already exists." },
        { status: 409 }
      );
    }

    const vendor = await VendorModel.create({
      name:        name as string,
      slug:        slug as string,
      description: (description as string | undefined) ?? "",
      logo:        (logo as string | undefined) ?? "",
      email:       normalizedEmail,
      phone:       (phone as string | undefined) ?? "",
      address:     (address as string | undefined) ?? "",
      city:        (city as string | undefined) ?? "",
      status:      (status as "pending" | "active" | "suspended" | undefined) ?? "pending",
      ownerId:     ownerId as string,
      ownerName:   ownerName as string,
    });

    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (err: unknown) {
    const isdup = typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000;
    if (isdup) {
      const keyPattern = (err as { keyPattern?: Record<string, number> }).keyPattern ?? {};
      const field = "email" in keyPattern ? "email address" : "name" in keyPattern ? "store name" : "slug";
      return NextResponse.json(
        { success: false, error: `A vendor with this ${field} already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: "Failed to create vendor" }, { status: 500 });
  }
}
