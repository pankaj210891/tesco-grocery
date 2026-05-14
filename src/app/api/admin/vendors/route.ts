import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorModel from "@/lib/db/models/vendor.model";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit  = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const status = searchParams.get("status") ?? "";

    const q = searchParams.get("q") ?? "";

    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;
    if (q) {
      filter.$or = [
        { name:  { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { city:  { $regex: q, $options: "i" } },
      ];
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
