import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";

// POST /api/admin/setup — creates the first admin if none exists. Dev/first-run only.
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const adminExists = await UserModel.findOne({ role: "admin" });
    if (adminExists) {
      return NextResponse.json({ success: false, error: "An admin account already exists" }, { status: 409 });
    }

    const body = await req.json() as { name?: string; email?: string; password?: string };
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: "name, email, and password are required" }, { status: 422 });
    }

    const existing = await UserModel.findOne({ email });
    if (existing) {
      await UserModel.updateOne({ email }, { $set: { role: "admin" } });
      return NextResponse.json({ success: true, message: "Existing user promoted to admin" });
    }

    const hashed = await bcrypt.hash(password, 12);
    await UserModel.create({ name, email, password: hashed, role: "admin" });

    return NextResponse.json({ success: true, message: "Admin account created. Please log in." }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Setup failed" }, { status: 500 });
  }
}
