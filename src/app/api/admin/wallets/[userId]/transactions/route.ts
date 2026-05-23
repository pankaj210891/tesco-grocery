import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { adminGetUserTransactions } from "@/services/wallet.service";
import { walletTransactionsQuerySchema } from "@/lib/validations/wallet";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

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
    const result = await adminGetUserTransactions(userId, page, limit);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[GET /api/admin/wallets/[userId]/transactions]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions." },
      { status: 500 }
    );
  }
}
