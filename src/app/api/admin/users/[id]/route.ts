import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import UserModel from "@/lib/db/models/user.model";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (id === auth.userId) {
      return NextResponse.json({ success: false, error: "Cannot modify your own account" }, { status: 400 });
    }

    const body = await req.json() as { role?: string; status?: string };
    const update: Record<string, string> = {};
    if (body.role   && ["customer", "vendor", "admin"].includes(body.role))     update.role   = body.role;
    if (body.status && ["active", "suspended"].includes(body.status)) update.status = body.status;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 422 });
    }

    const user = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select("-password");
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
