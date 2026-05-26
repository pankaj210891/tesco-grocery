import { NextRequest } from "next/server";
import { clearAuthCookie, clearRefreshCookie, AUTH_COOKIE, REFRESH_COOKIE } from "@/lib/utils/authCookie";
import { revokeToken } from "@/lib/blocklist";
import { verifyToken, verifyRefreshToken, ACCESS_TOKEN_EXPIRY_SEC, REFRESH_TOKEN_EXPIRY_SEC } from "@/services/auth.service";
import logger from "@/lib/logger";

export async function POST(req: NextRequest): Promise<Response> {
  const accessToken  = req.cookies.get(AUTH_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  // Revoke access token so it cannot be used for its remaining 15-minute window
  if (accessToken) {
    try {
      const payload = verifyToken(accessToken);
      if (payload.jti) await revokeToken(payload.jti, ACCESS_TOKEN_EXPIRY_SEC);
    } catch { /* already expired — nothing to revoke */ }
  }

  // Revoke refresh token so it cannot be used to obtain new access tokens
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.jti) await revokeToken(payload.jti, REFRESH_TOKEN_EXPIRY_SEC);
    } catch { /* already expired — nothing to revoke */ }
  }

  logger.info({}, "user logged out");

  const res = Response.json({ success: true });
  clearAuthCookie(res);
  clearRefreshCookie(res);
  return res;
}
