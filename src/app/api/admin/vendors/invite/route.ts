import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorInviteModel from "@/lib/db/models/vendor-invite.model";
import UserModel from "@/lib/db/models/user.model";
import { inviteVendorSchema } from "@/lib/validations/vendor-onboarding";
import { sendVendorInvite } from "@/services/email.service";

const INVITE_TTL_HOURS = 72;

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = 20;

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [invites, total] = await Promise.all([
    VendorInviteModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    VendorInviteModel.countDocuments(filter),
  ]);

  // Mark expired ones (past expiresAt but still "pending" in DB)
  const now = new Date();
  const normalized = invites.map((inv) => ({
    ...inv,
    _id:    inv._id.toString(),
    status: inv.status === "pending" && inv.expiresAt < now ? "expired" : inv.status,
  }));

  return NextResponse.json({
    success: true,
    data: { invites: normalized, total, page, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inviteVendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const { email, businessName, contactName } = parsed.data;

  await connectDB();

  // Bug 3 fix: block invite if ANY user with this email already exists
  const existingUser = await UserModel.findOne({ email }).lean<{ role: string }>();
  if (existingUser) {
    return NextResponse.json(
      {
        success: false,
        error:
          existingUser.role === "vendor"
            ? "A vendor account already exists for this email. They can log in directly."
            : "An account with this email already exists.",
      },
      { status: 409 }
    );
  }

  // Cancel any existing pending invites for this email before issuing a new one
  await VendorInviteModel.updateMany(
    { email, status: "pending" },
    { $set: { status: "expired" } }
  );

  const rawToken  = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  await VendorInviteModel.create({
    email,
    businessName,
    contactName,
    token:     rawToken,
    status:    "pending",
    expiresAt,
    invitedBy: auth.userId,
  });

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/vendor/onboarding?token=${rawToken}`;

  await sendVendorInvite(email, {
    contactName,
    businessName,
    inviteUrl,
    expiresInHrs: INVITE_TTL_HOURS,
  });

  return NextResponse.json(
    { success: true, message: `Invite sent to ${email}` },
    { status: 201 }
  );
}
