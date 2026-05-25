import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { loginUser } from "@/services/auth.service";
import { setAuthCookie, setRefreshCookie } from "@/lib/utils/authCookie";
import { loginLimiter, applyRateLimit, getClientIp } from "@/lib/ratelimit";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes per IP
  const ip    = getClientIp(req);
  const limit = await applyRateLimit(loginLimiter, `login:${ip}`);
  if (limit.limited) {
    return Response.json(
      { success: false, error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  try {
    const body   = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const { email, password } = parsed.data;
    const { user, token, refreshToken } = await loginUser(email, password);

    logger.info({ userId: user._id, role: user.role }, "login successful");

    const res = Response.json({ success: true, data: { user, token } });
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed.";
    const status  = message.includes("Invalid email") ? 401 : 500;
    if (status === 500) logger.error({ err }, "login error");
    return Response.json({ success: false, error: message }, { status });
  }
}
