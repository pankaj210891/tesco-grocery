import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { topupWallet } from "@/services/wallet.service";
import { topupSchema } from "@/lib/validations/wallet";

export async function POST(req: Request) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body   = await req.json();
    const parsed = topupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 422 }
      );
    }

    const { amount, description } = parsed.data;
    const result = await topupWallet(auth.userId, amount, description);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Topup failed.";
    console.error("[POST /api/account/wallet/topup]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
