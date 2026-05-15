import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";

const RESET_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findOne({ email });

    // Always respond with success to avoid email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }

    const token   = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_EXPIRES_MS);

    await UserModel.updateOne(
      { _id: user._id },
      { passwordResetToken: token, passwordResetExpires: expires },
    );

    // In production, send an email with the reset link.
    // For this demo, the token is returned in the response so it can be tested.
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
      // demo only — remove in production:
      resetToken: token,
      resetUrl:   `/reset-password?token=${token}`,
    });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
