import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import UserModel from "@/lib/db/models/user.model";
import { getAuthUser } from "@/lib/utils/apiAuth";
import type { AccountProfile } from "@/types";

export async function GET(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    type UserLean = {
      _id: { toString(): string };
      name: string;
      email: string;
      role: string;
      status: string;
      phone?: string | null;
      isPhoneVerified?: boolean;
      dietaryPreferences?: string[];
      marketingPreference?: string | null;
      hearFromBrands?: boolean;
      createdAt: Date;
    };

    const user = await UserModel
      .findById(authUser.userId)
      .select("-password -passwordResetToken -passwordResetExpires")
      .lean<UserLean>();

    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    const steps = [
      {
        key:         "phone",
        label:       "Mobile number",
        description: "Verify your mobile number so we can send you order updates and messages to keep your account secure.",
        completed:   !!user.phone,
        href:        "/account/profile",
        linkLabel:   "Add mobile number",
      },
      {
        key:         "marketing",
        label:       "Marketing preferences",
        description: "Don't miss out on special offers, helpful information, exclusive coupons and more.",
        completed:   user.marketingPreference != null,
        href:        "/account/preferences/marketing",
        linkLabel:   "Update marketing preferences",
      },
      {
        key:         "dietary",
        label:       "Dietary preferences",
        description: "We'll use this information to show you more of the products you like.",
        completed:   Array.isArray(user.dietaryPreferences) && user.dietaryPreferences.length > 0,
        href:        "/account/preferences/dietary",
        linkLabel:   "Update dietary preferences",
      },
    ];

    const completedSteps = steps.filter((s) => s.completed).length;
    const percentage = Math.round((completedSteps / steps.length) * 100);

    const profile: AccountProfile = {
      _id:                user._id.toString(),
      name:               user.name,
      email:              user.email,
      role:               user.role as AccountProfile["role"],
      status:             user.status as AccountProfile["status"],
      phone:              user.phone ?? null,
      isPhoneVerified:    user.isPhoneVerified ?? false,
      dietaryPreferences: user.dietaryPreferences ?? [],
      marketingPreference: (user.marketingPreference ?? null) as AccountProfile["marketingPreference"],
      hearFromBrands:     user.hearFromBrands ?? false,
      createdAt:          user.createdAt.toISOString(),
      setupProgress: {
        totalSteps:     steps.length,
        completedSteps,
        percentage,
        steps,
      },
    };

    return Response.json({ data: profile });
  } catch (err) {
    console.error("[GET /api/account/profile]", err);
    return Response.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

const UpdateProfileSchema = z.object({
  name:  z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().regex(/^\+?[\d\s\-()\\.]{7,20}$/, "Invalid phone number").nullable().optional(),
});

export async function PUT(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const result = UpdateProfileSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (result.data.name !== undefined) updates.name = result.data.name;
  if (result.data.phone !== undefined) {
    updates.phone = result.data.phone;
    // Reset verification when a new number is set; keep false when number is cleared
    updates.isPhoneVerified = false;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    await connectDB();
    const updated = await UserModel.findByIdAndUpdate(
      authUser.userId,
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({ success: true, message: "Profile updated." });
  } catch (err) {
    console.error("[PUT /api/account/profile]", err);
    return Response.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
