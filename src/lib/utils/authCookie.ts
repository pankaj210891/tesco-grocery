export const AUTH_COOKIE    = "auth_token";
export const REFRESH_COOKIE = "refresh_token";

const ACCESS_MAX_AGE  = 15 * 60;           // 15 minutes — matches access token expiry
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days — matches refresh token expiry

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function buildCookie(
  name:    string,
  value:   string,
  maxAge:  number,
  sameSite: "Lax" | "Strict" = "Lax"
): string {
  const parts = [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
  ];
  if (IS_PRODUCTION) parts.push("Secure");
  return parts.join("; ");
}

// ─── Access token cookie (Lax — needed for top-level navigations) ─────────────

export function setAuthCookie(res: Response, token: string): void {
  res.headers.append("Set-Cookie", buildCookie(AUTH_COOKIE, token, ACCESS_MAX_AGE, "Lax"));
}

export function clearAuthCookie(res: Response): void {
  res.headers.append("Set-Cookie", buildCookie(AUTH_COOKIE, "", 0, "Lax"));
}

// ─── Refresh token cookie (Strict — only sent on same-origin requests) ────────

export function setRefreshCookie(res: Response, token: string): void {
  res.headers.append("Set-Cookie", buildCookie(REFRESH_COOKIE, token, REFRESH_MAX_AGE, "Strict"));
}

export function clearRefreshCookie(res: Response): void {
  res.headers.append("Set-Cookie", buildCookie(REFRESH_COOKIE, "", 0, "Strict"));
}
