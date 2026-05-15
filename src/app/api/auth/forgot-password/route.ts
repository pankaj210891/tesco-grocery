import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import { sendPasswordReset } from "@/services/email.service";

const RESET_EXPIRES_MS  = 60 * 60 * 1000; // 1 hour
const OTP_EXPIRES_MIN   = 60;

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
    const otp     = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit OTP
    const expires = new Date(Date.now() + RESET_EXPIRES_MS);

    await UserModel.updateOne(
      { _id: user._id },
      { passwordResetToken: token, passwordResetExpires: expires },
    );

    try {
      await sendPasswordReset(email, {
        customerName: user.name as string,
        otp,
        expiresInMin: OTP_EXPIRES_MIN,
      });
      console.log("[forgot-password] Reset OTP email sent to", email);
    } catch (emailErr) {
      console.error("[forgot-password] Failed to send reset email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a reset OTP has been sent.",
      resetToken: token,
      resetUrl:   `/reset-password?token=${token}`,
    });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
