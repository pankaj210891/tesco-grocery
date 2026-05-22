import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import DietaryOptionModel from "@/lib/db/models/dietary-option.model";
import { getAuthUser } from "@/lib/utils/apiAuth";

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

  // Validate shape first — array of strings
  const ShapeSchema = z.object({
    dietaryPreferences: z.array(z.string().min(1)).max(50),
  });
  const shaped = ShapeSchema.safeParse(body);
  if (!shaped.success) {
    return Response.json({ error: shaped.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
  }

  try {
    await connectDB();

    // Fetch all known dietary option values from DB (active and inactive)
    const knownOptions = await DietaryOptionModel
      .find({})
      .select("value")
      .lean<{ value: string }[]>();
    const knownValues = new Set(knownOptions.map((o) => o.value));

    // Filter out any stale/unknown values submitted by the client
    const cleaned = shaped.data.dietaryPreferences.filter((v) => knownValues.has(v));

    const updated = await UserModel.findByIdAndUpdate(
      authUser.userId,
      { $set: { dietaryPreferences: cleaned } },
      { new: true, select: "dietaryPreferences" }
    ).lean<{ dietaryPreferences: string[] }>();

    if (!updated) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({ success: true, message: "Dietary preferences updated." });
  } catch (err) {
    console.error("[PUT /api/account/preferences/dietary]", err);
    return Response.json({ error: "Failed to update dietary preferences." }, { status: 500 });
  }
}
