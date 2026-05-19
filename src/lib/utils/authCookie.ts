const AUTH_COOKIE   = "auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — matches JWT expiry

export function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieValue  = [
    `${AUTH_COOKIE}=${token}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(isProduction ? ["Secure"] : []),
  ].join("; ");

  res.headers.append("Set-Cookie", cookieValue);
}

export function clearAuthCookie(res: Response): void {
  const cookieValue = [
    `${AUTH_COOKIE}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ].join("; ");

  res.headers.append("Set-Cookie", cookieValue);
}
