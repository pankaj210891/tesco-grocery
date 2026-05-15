import { registerSchema } from "@/lib/validations/auth";
import { registerUser } from "@/services/auth.service";
import { sendWelcome } from "@/services/email.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const { name, email, password } = parsed.data;
    const { user, token } = await registerUser(name, email, password);

    sendWelcome(email, { customerName: name });

    return Response.json({ success: true, data: { user, token } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed.";
    const status  = message.includes("already exists") ? 409 : 500;
    return Response.json({ success: false, error: message }, { status });
  }
}
