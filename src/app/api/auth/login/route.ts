import { loginSchema } from "@/lib/validations/auth";
import { loginUser } from "@/services/auth.service";
import { setAuthCookie } from "@/lib/utils/authCookie";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const { email, password } = parsed.data;
    const { user, token } = await loginUser(email, password);

    const res = Response.json({ success: true, data: { user, token } });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed.";
    const status  = message.includes("Invalid email") ? 401 : 500;
    return Response.json({ success: false, error: message }, { status });
  }
}
