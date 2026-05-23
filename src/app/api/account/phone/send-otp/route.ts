import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import { getAuthUser } from "@/lib/utils/apiAuth";
import {
  generateOtp,
  hashOtp,
  secondsUntilResend,
  OTP_TTL_MIN,
  OTP_COOLDOWN_SEC,
  OTP_MAX_ATTEMPTS,
  OTP_LOCKOUT_MIN,
} from "@/lib/otp/generate";
import { transporter, FROM_ADDRESS } from "@/lib/email/mailer";
import { phoneVerificationTemplate } from "@/lib/email/templates";

type UserLean = {
  _id:              { toString(): string };
  name:             string;
  email:            string;
  phone?:           string | null;
  isPhoneVerified?: boolean;
  phoneOtpAttempts?: number;
  phoneOtpLastSent?: Date | null;
};

export async function POST(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await UserModel
    .findById(authUser.userId)
    .select("name email phone isPhoneVerified phoneOtpAttempts phoneOtpLastSent")
    .lean<UserLean>();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  if (!user.phone) return Response.json({ error: "No phone number saved. Please add a phone number first." }, { status: 400 });
  if (user.isPhoneVerified) return Response.json({ error: "Phone number is already verified." }, { status: 400 });

  // Rate limit — lockout after too many attempts
  if ((user.phoneOtpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    return Response.json(
      { error: `Too many attempts. Please wait ${OTP_LOCKOUT_MIN} minutes before trying again.` },
      { status: 429 },
    );
  }

  // Cooldown between sends
  const wait = secondsUntilResend(user.phoneOtpLastSent ?? null);
  if (wait > 0) {
    return Response.json(
      { error: `Please wait ${wait} seconds before requesting a new code.`, retryAfter: wait },
      { status: 429 },
    );
  }

  const otp     = generateOtp();
  const hashed  = hashOtp(otp);
  const expires = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

  await UserModel.findByIdAndUpdate(authUser.userId, {
    $set: {
      phoneOtp:         hashed,
      phoneOtpExpires:  expires,
      phoneOtpLastSent: new Date(),
    },
    $inc: { phoneOtpAttempts: 1 },
  });

  // Send OTP via email (SMS provider can replace this)
  const { subject, html } = phoneVerificationTemplate({
    customerName: user.name,
    phone:        user.phone,
    otp,
    expiresInMin: OTP_TTL_MIN,
  });

  try {
    await transporter.sendMail({ from: FROM_ADDRESS, to: user.email, subject, html });
  } catch (mailErr) {
    console.error("[send-otp] email failed:", mailErr);
    // Don't expose mail errors to client — OTP is still stored, dev can read from console
  }

  // Always log to console in development for easy testing
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📱 [DEV] Phone OTP for ${user.phone}: ${otp} (expires in ${OTP_TTL_MIN} min)\n`);
  }

  return Response.json({
    success:      true,
    message:      `A verification code has been sent to your email (${user.email}).`,
    cooldown:     OTP_COOLDOWN_SEC,
    expiresInMin: OTP_TTL_MIN,
  });
}
