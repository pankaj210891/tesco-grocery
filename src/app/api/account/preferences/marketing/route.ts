import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import { getAuthUser } from "@/lib/utils/apiAuth";

const MARKETING_OPTIONS = ["email_digital_post", "digital_post_only", "unsubscribed"] as const;

const MarketingSchema = z.object({
  marketingPreference: z.enum(MARKETING_OPTIONS),
  hearFromBrands:      z.boolean().default(false),
});

export async function GET(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    type Lean = { marketingPreference?: string | null; hearFromBrands?: boolean };
    const user = await UserModel
      .findById(authUser.userId)
      .select("marketingPreference hearFromBrands")
      .lean<Lean>();

    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({
      data: {
        marketingPreference: user.marketingPreference ?? null,
        hearFromBrands:      user.hearFromBrands ?? false,
      },
    });
  } catch (err) {
    console.error("[GET /api/account/preferences/marketing]", err);
    return Response.json({ error: "Failed to load marketing preferences." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const result = MarketingSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
  }

  try {
    await connectDB();
    const updated = await UserModel.findByIdAndUpdate(
      authUser.userId,
      {
        $set: {
          marketingPreference: result.data.marketingPreference,
          hearFromBrands:      result.data.hearFromBrands,
        },
      },
      { new: true, select: "marketingPreference hearFromBrands" }
    ).lean<{ marketingPreference: string; hearFromBrands: boolean }>();

    if (!updated) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({ success: true, message: "Marketing preferences updated." });
  } catch (err) {
    console.error("[PUT /api/account/preferences/marketing]", err);
    return Response.json({ error: "Failed to update marketing preferences." }, { status: 500 });
  }
}
