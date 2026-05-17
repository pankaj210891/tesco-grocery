import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import VendorInviteModel from "@/lib/db/models/vendor-invite.model";
import UserModel from "@/lib/db/models/user.model";
import VendorModel from "@/lib/db/models/vendor.model";
import { completeOnboardingSchema } from "@/lib/validations/vendor-onboarding";
import { signToken } from "@/services/auth.service";
import { sendWelcome } from "@/services/email.service";
import type { User } from "@/types";

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const {
    token,
    name,
    businessName,
    slug: rawSlug,
    description,
    phone,
    address,
    city,
    password,
  } = parsed.data;

  await connectDB();

  const invite = await VendorInviteModel.findOne({ token });
  if (!invite) {
    return NextResponse.json(
      { success: false, error: "Invalid or unrecognised invite link." },
      { status: 404 }
    );
  }
  if (invite.status !== "pending" || new Date() > invite.expiresAt) {
    return NextResponse.json(
      { success: false, error: "This invite link has expired or already been used." },
      { status: 410 }
    );
  }

  // Guard: no existing user with this email
  const existingUser = await UserModel.findOne({ email: invite.email }).lean();
  if (existingUser) {
    return NextResponse.json(
      { success: false, error: "An account with this email already exists. Please log in." },
      { status: 409 }
    );
  }

  // Guard: slug uniqueness
  const slug = rawSlug || toSlug(businessName);
  const slugTaken = await VendorModel.findOne({ slug }).lean();
  if (slugTaken) {
    return NextResponse.json(
      { success: false, error: "This store slug is already taken. Please choose another." },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  const userDoc = await UserModel.create({
    name,
    email:    invite.email,
    password: hashed,
    role:     "vendor",
    status:   "active",
  });

  await VendorModel.create({
    name:         businessName,
    slug,
    description:  description ?? "",
    email:        invite.email,
    phone:        phone ?? "",
    address:      address ?? "",
    city:         city ?? "",
    status:       "pending",   // requires admin approval before going live
    ownerId:      userDoc._id,
    ownerName:    name,
  });

  await VendorInviteModel.findByIdAndUpdate(invite._id, { status: "accepted" });

  void sendWelcome(invite.email, { customerName: name });

  const user: User = {
    _id:       userDoc._id.toString(),
    name:      userDoc.name,
    email:     userDoc.email,
    role:      "vendor",
    status:    "active",
    createdAt: userDoc.createdAt.toISOString(),
  };

  const jwtToken = signToken({
    userId: user._id,
    email:  user.email,
    name:   user.name,
    role:   "vendor",
  });

  return NextResponse.json(
    { success: true, data: { user, token: jwtToken } },
    { status: 201 }
  );
}
