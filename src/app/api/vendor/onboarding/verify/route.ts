import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import VendorInviteModel from "@/lib/db/models/vendor-invite.model";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Invite token is required." },
      { status: 400 }
    );
  }

  await connectDB();

  const invite = await VendorInviteModel.findOne({ token }).lean<{
    email:        string;
    businessName: string;
    contactName:  string;
    status:       string;
    expiresAt:    Date;
  }>();

  if (!invite) {
    return NextResponse.json(
      { success: false, error: "Invalid or unrecognised invite link." },
      { status: 404 }
    );
  }

  if (invite.status === "accepted") {
    return NextResponse.json(
      { success: false, error: "This invite has already been used. Please log in." },
      { status: 410 }
    );
  }

  if (invite.status === "expired" || new Date() > new Date(invite.expiresAt)) {
    return NextResponse.json(
      { success: false, error: "This invite link has expired. Please ask the admin to resend." },
      { status: 410 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      email:        invite.email,
      businessName: invite.businessName,
      contactName:  invite.contactName,
    },
  });
}
