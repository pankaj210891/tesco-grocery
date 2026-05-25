import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { hashOtp, isOtpExpired, OTP_MAX_ATTEMPTS, OTP_LOCKOUT_MIN } from "@/lib/otp/generate";

const VerifySchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must contain only digits"),
});

type UserLean = {
  _id:               { toString(): string };
  phone?:            string | null;
  isPhoneVerified?:  boolean;
  phoneOtp?:         string | null;
  phoneOtpExpires?:  Date | null;
  phoneOtpAttempts?: number;
};

export async function POST(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = VerifySchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0]?.message ?? "Invalid OTP" }, { status: 400 });
  }

  await connectDB();
  const inputHash = hashOtp(result.data.otp);

  // ── Atomic success path ───────────────────────────────────────────────────
  //
  // All conditions go into the query filter so MongoDB's document-level lock
  // guarantees only ONE concurrent request can succeed. A second identical
  // request arrives at the same instant will find no matching document
  // (isPhoneVerified is already true or phoneOtp is already null) and falls
  // through to the error path — eliminating the TOCTOU race condition.
  const verified = await UserModel.findOneAndUpdate(
    {
      _id:              authUser.userId,
      phoneOtp:         inputHash,           // OTP hash must match
      phoneOtpExpires:  { $gt: new Date() }, // must not be expired
      isPhoneVerified:  false,               // must not already be verified
      phoneOtpAttempts: { $lt: OTP_MAX_ATTEMPTS }, // must not be locked out
    },
    {
      $set: {
        isPhoneVerified:  true,
        phoneOtp:         null,
        phoneOtpExpires:  null,
        phoneOtpLastSent: null,
        phoneOtpAttempts: 0,
      },
    },
    { new: true }
  );

  if (verified) {
    return Response.json({ success: true, message: "Phone number verified successfully." });
  }

  // ── Error diagnosis ──────────────────────────────────────────────────────
  // The atomic update found no matching document. Determine why so we can
  // return an actionable error message.
  const user = await UserModel
    .findById(authUser.userId)
    .select("isPhoneVerified phoneOtp phoneOtpExpires phoneOtpAttempts")
    .lean<UserLean>();

  if (!user)            return Response.json({ error: "User not found" }, { status: 404 });
  if (user.isPhoneVerified) return Response.json({ error: "Phone is already verified." }, { status: 400 });
  if (!user.phoneOtp)   return Response.json({ error: "No pending verification. Please request a new code." }, { status: 400 });

  if (isOtpExpired(user.phoneOtpExpires ?? null)) {
    await UserModel.findByIdAndUpdate(authUser.userId, {
      $set: { phoneOtp: null, phoneOtpExpires: null },
    });
    return Response.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
  }

  if ((user.phoneOtpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    return Response.json(
      { error: `Too many failed attempts. Please wait ${OTP_LOCKOUT_MIN} minutes and request a new code.` },
      { status: 429 }
    );
  }

  // Wrong OTP — increment attempt counter atomically and return remaining count
  const afterIncrement = await UserModel.findByIdAndUpdate(
    authUser.userId,
    { $inc: { phoneOtpAttempts: 1 } },
    { new: true, select: "phoneOtpAttempts" }
  ).lean<{ phoneOtpAttempts?: number }>();

  const used      = afterIncrement?.phoneOtpAttempts ?? OTP_MAX_ATTEMPTS;
  const remaining = OTP_MAX_ATTEMPTS - used;
  const msg = remaining > 0
    ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
    : `Too many failed attempts. Please wait ${OTP_LOCKOUT_MIN} minutes and request a new code.`;

  return Response.json({ error: msg }, { status: 400 });
}
