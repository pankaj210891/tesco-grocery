import { NextRequest } from "next/server";
import {
  verifyRefreshToken,
  signToken,
  signRefreshToken,
  REFRESH_TOKEN_EXPIRY_SEC,
} from "@/services/auth.service";
import { setAuthCookie, setRefreshCookie, REFRESH_COOKIE } from "@/lib/utils/authCookie";
import { revokeToken, isTokenRevoked } from "@/lib/blocklist";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return Response.json({ success: false, error: "No refresh token provided" }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return Response.json({ success: false, error: "Invalid or expired refresh token" }, { status: 401 });
  }

  // Reject if this refresh token has already been revoked (replay prevention)
  if (payload.jti && (await isTokenRevoked(payload.jti))) {
    logger.warn({ userId: payload.userId }, "revoked refresh token replay attempt");
    return Response.json({ success: false, error: "Token has been revoked" }, { status: 401 });
  }

  const { userId, email, name, role } = payload;
  const tokenPayload = { userId, email, name, role };

  // Issue new token pair
  const newAccessToken  = signToken(tokenPayload);
  const newRefreshToken = signRefreshToken(tokenPayload);

  // Revoke the consumed refresh token so it can't be replayed
  if (payload.jti) {
    await revokeToken(payload.jti, REFRESH_TOKEN_EXPIRY_SEC);
  }

  logger.info({ userId }, "token refreshed");

  const res = Response.json({ success: true, data: { token: newAccessToken } });
  setAuthCookie(res, newAccessToken);
  setRefreshCookie(res, newRefreshToken);
  return res;
}
