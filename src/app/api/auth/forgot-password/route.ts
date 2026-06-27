import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import { sendPasswordReset } from "@/services/email.service";
import { forgotPasswordLimiter, applyRateLimit, getClientIp } from "@/lib/ratelimit";
import logger from "@/lib/logger";

const RESET_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
const OTP_EXPIRES_MIN  = 60;

// Static success message used whether the user exists or not (prevents email enumeration)
const SUCCESS_MSG = "If an account with that email exists, a reset OTP has been sent.";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 requests per hour per IP
    const ip    = getClientIp(req);
    const limit = await applyRateLimit(forgotPasswordLimiter, `fp:${ip}`);
    if (limit.limited) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }
  } catch {
    // Rate limiter unavailable — fail open and continue
  }

  try {
    const body  = await req.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findOne({ email });

    // Always return the same message — never reveal whether an account exists
    if (!user) {
      return NextResponse.json({ success: true, message: SUCCESS_MSG });
    }

    const token   = crypto.randomBytes(32).toString("hex");
    const otp     = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + RESET_EXPIRES_MS);

    await UserModel.updateOne(
      { _id: user._id },
      { passwordResetToken: token, passwordResetExpires: expires }
    );

    try {
      await sendPasswordReset(email, {
        customerName: user.name as string,
        otp,
        expiresInMin: OTP_EXPIRES_MIN,
      });
      logger.info({ email }, "password reset email sent");
    } catch (emailErr) {
      logger.error({ err: emailErr }, "failed to send password reset email");
    }

    return NextResponse.json({ success: true, message: SUCCESS_MSG });
  } catch (err) {
    logger.error({ err }, "forgot-password error");
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
