import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { token?: string; password?: string };
    const { token, password } = body;

    if (!token?.trim() || !password) {
      return NextResponse.json({ success: false, error: "Token and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    const user = await UserModel.findOne({
      passwordResetToken:   token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error:   "Reset link is invalid or has expired. Please request a new one.",
      }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    // Atomic update: only clear the token if it still matches (prevents race on concurrent resets)
    const updated = await UserModel.findOneAndUpdate(
      { _id: user._id, passwordResetToken: token, passwordResetExpires: { $gt: new Date() } },
      {
        $set: {
          password:             hashed,
          passwordResetToken:   null,
          passwordResetExpires: null,
        },
      },
    );
    if (!updated) {
      return NextResponse.json({
        success: false,
        error: "Reset link was already used or has expired. Please request a new one.",
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
