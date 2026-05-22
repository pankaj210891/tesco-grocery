import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import { getAuthUser } from "@/lib/utils/apiAuth";

const VALID_DIETARY = [
  "coeliac", "diabetic", "paleo", "pescatarian",
  "teetotal", "vegan", "vegetarian",
] as const;

const DietarySchema = z.object({
  dietaryPreferences: z
    .array(z.enum(VALID_DIETARY))
    .max(VALID_DIETARY.length),
});

export async function GET(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    type Lean = { dietaryPreferences?: string[] };
    const user = await UserModel
      .findById(authUser.userId)
      .select("dietaryPreferences")
      .lean<Lean>();

    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({ data: { dietaryPreferences: user.dietaryPreferences ?? [] } });
  } catch (err) {
    console.error("[GET /api/account/preferences/dietary]", err);
    return Response.json({ error: "Failed to load dietary preferences." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const result = DietarySchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
  }

  try {
    await connectDB();
    const updated = await UserModel.findByIdAndUpdate(
      authUser.userId,
      { $set: { dietaryPreferences: result.data.dietaryPreferences } },
      { new: true, select: "dietaryPreferences" }
    ).lean<{ dietaryPreferences: string[] }>();

    if (!updated) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({ success: true, message: "Dietary preferences updated." });
  } catch (err) {
    console.error("[PUT /api/account/preferences/dietary]", err);
    return Response.json({ error: "Failed to update dietary preferences." }, { status: 500 });
  }
}
