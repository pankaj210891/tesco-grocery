import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE = "auth_token";

// Routes that require a logged-in user (any role)
const CUSTOMER_PROTECTED = ["/account"];
// Routes that require vendor or admin role
const VENDOR_PROTECTED = ["/vendor"];
// Routes that require admin role
const ADMIN_PROTECTED = ["/admin"];

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(secret);
}

interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: "customer" | "vendor" | "admin";
}

async function verifyAuth(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute    = ADMIN_PROTECTED.some((p) => pathname.startsWith(p));
  const isVendorRoute   = VENDOR_PROTECTED.some((p) => pathname.startsWith(p));
  const isCustomerRoute = CUSTOMER_PROTECTED.some((p) => pathname.startsWith(p));

  if (!isAdminRoute && !isVendorRoute && !isCustomerRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAuth(token);

  if (!payload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(AUTH_COOKIE);
    return res;
  }

  if (isAdminRoute && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isVendorRoute && payload.role !== "vendor" && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Inject role into a header so server components can read it without re-verifying
  const res = NextResponse.next();
  res.headers.set("x-user-id",   payload.userId);
  res.headers.set("x-user-role", payload.role);
  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/vendor/:path*",
    "/account/:path*",
  ],
};
