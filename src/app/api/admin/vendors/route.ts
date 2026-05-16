import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";
import { AdminVendorQuerySchema } from "@/lib/validations/admin-filters";

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

  const { page, limit, q, status, dateFrom, dateTo } = parsed.data;

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

    const [vendors, total] = await Promise.all([
      VendorModel.find(filter)
        .sort({ createdAt: -1 })
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

    const vendor = await VendorModel.create({
      name:        name as string,
      slug:        slug as string,
      description: (description as string | undefined) ?? "",
      logo:        (logo as string | undefined) ?? "",
      email:       email as string,
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
    if (isdup) return NextResponse.json({ success: false, error: "A vendor with this slug already exists" }, { status: 409 });
    return NextResponse.json({ success: false, error: "Failed to create vendor" }, { status: 500 });
  }
}
