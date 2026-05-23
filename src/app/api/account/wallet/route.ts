import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { getWallet } from "@/services/wallet.service";

export async function GET(req: Request) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const wallet = await getWallet(auth.userId);
    return NextResponse.json({ success: true, data: wallet });
  } catch (err) {
    console.error("[GET /api/account/wallet]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch wallet." }, { status: 500 });
  }
}
