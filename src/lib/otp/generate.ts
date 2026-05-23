import { createHash, randomInt } from "crypto";

export const OTP_LENGTH        = 6;
export const OTP_TTL_MIN       = 10;
export const OTP_COOLDOWN_SEC  = 60;
export const OTP_MAX_ATTEMPTS  = 5;
export const OTP_LOCKOUT_MIN   = 30;

export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

export function isOtpExpired(expires: Date | null): boolean {
  if (!expires) return true;
  return new Date() > new Date(expires);
}

export function secondsUntilResend(lastSent: Date | null): number {
  if (!lastSent) return 0;
  const elapsed = Math.floor((Date.now() - new Date(lastSent).getTime()) / 1000);
  return Math.max(0, OTP_COOLDOWN_SEC - elapsed);
}
