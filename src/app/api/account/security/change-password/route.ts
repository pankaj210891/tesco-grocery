import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import { getAuthUser } from "@/lib/utils/apiAuth";
import logger from "@/lib/logger";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword:     z.string().min(8, "New password must be at least 8 characters"),
});

export async function PUT(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const result = ChangePasswordSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
  }

  if (result.data.currentPassword === result.data.newPassword) {
    return Response.json(
      { error: "New password must differ from your current password." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    type UserWithPassword = { password: string };
    const user = await UserModel
      .findById(authUser.userId)
      .select("password")
      .lean<UserWithPassword>();

    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(result.data.currentPassword, user.password);
    if (!valid) {
      return Response.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(result.data.newPassword, 12);
    await UserModel.findByIdAndUpdate(authUser.userId, { $set: { password: hashed } });

    return Response.json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    logger.error({ err }, "change-password error");
    return Response.json({ error: "Failed to change password." }, { status: 500 });
  }
}
