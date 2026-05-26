import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const AUTH_COOKIE    = "auth_token";
const REFRESH_COOKIE = "refresh_token";
const ACCESS_MAX_AGE = 15 * 60; // 15 min

const CUSTOMER_PROTECTED = ["/account", "/checkout"];
const VENDOR_PROTECTED   = ["/vendor"];
const ADMIN_PROTECTED    = ["/admin"];

function getAccessSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

function getRefreshSecret(): Uint8Array {
  const s = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

interface JwtPayload {
  userId: string;
  email:  string;
  name:   string;
  role:   "customer" | "vendor" | "admin";
  jti?:   string;
}

async function verifyAccess(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

async function verifyRefresh(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

function redirectToLogin(req: NextRequest, pathname: string): NextResponse {
  const url = new URL("/login", req.url);
  url.searchParams.set("redirect", pathname);
  const res = NextResponse.redirect(url);
  res.cookies.delete(AUTH_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdmin    = ADMIN_PROTECTED.some((p)    => pathname.startsWith(p));
  const isVendor   = VENDOR_PROTECTED.some((p)   => pathname.startsWith(p));
  const isCustomer = CUSTOMER_PROTECTED.some((p) => pathname.startsWith(p));

  if (!isAdmin && !isVendor && !isCustomer) return NextResponse.next();

  const accessToken  = req.cookies.get(AUTH_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  // Fast path: valid access token
  let payload = accessToken ? await verifyAccess(accessToken) : null;

  if (!payload && refreshToken) {
    // Access token expired/missing — try refresh token (silent rotation)
    const refreshPayload = await verifyRefresh(refreshToken);

    if (refreshPayload) {
      // Issue a fresh access token and let the request through
      const { userId, email, name, role } = refreshPayload;

      const newAccessToken = await new SignJWT({ userId, email, name, role })
        .setProtectedHeader({ alg: "HS256" })
        .setJti(crypto.randomUUID())
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(getAccessSecret());

      const res = NextResponse.next();
      res.cookies.set(AUTH_COOKIE, newAccessToken, {
        maxAge:   ACCESS_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        secure:   process.env.NODE_ENV === "production",
        path:     "/",
      });

      payload = refreshPayload;

      // Role checks with refreshed payload
      if (isAdmin  && payload.role !== "admin") return NextResponse.redirect(new URL("/", req.url));
      if (isVendor && payload.role !== "vendor" && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      return res;
    }
  }

  if (!payload) return redirectToLogin(req, pathname);

  if (isAdmin  && payload.role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  if (isVendor && payload.role !== "vendor" && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/vendor/:path*",
    "/account/:path*",
    "/checkout",
    "/checkout/:path*",
  ],
};
