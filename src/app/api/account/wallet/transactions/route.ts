import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { getWalletTransactions } from "@/services/wallet.service";
import { walletTransactionsQuerySchema } from "@/lib/validations/wallet";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = walletTransactionsQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 }
    );
  }

  try {
    const { page, limit } = parsed.data;
    const result = await getWalletTransactions(auth.userId, page, limit);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[GET /api/account/wallet/transactions]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch transactions." }, { status: 500 });
  }
}
