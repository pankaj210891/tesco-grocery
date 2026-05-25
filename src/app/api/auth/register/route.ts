import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { registerUser } from "@/services/auth.service";
import { sendWelcome } from "@/services/email.service";
import { setAuthCookie, setRefreshCookie } from "@/lib/utils/authCookie";
import { registerLimiter, applyRateLimit, getClientIp } from "@/lib/ratelimit";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  // Rate limit: 3 registrations per hour per IP
  const ip    = getClientIp(req);
  const limit = await applyRateLimit(registerLimiter, `register:${ip}`);
  if (limit.limited) {
    return Response.json(
      { success: false, error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  try {
    const body   = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const { name, email, password } = parsed.data;
    const { user, token, refreshToken } = await registerUser(name, email, password);

    await sendWelcome(email, { customerName: name });

    logger.info({ userId: user._id, role: user.role }, "user registered");

    const res = Response.json({ success: true, data: { user, token } }, { status: 201 });
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed.";
    const status  = message.includes("already exists") ? 409 : 500;
    if (status === 500) logger.error({ err }, "register error");
    return Response.json({ success: false, error: message }, { status });
  }
}
