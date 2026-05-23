import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { adminDebitWallet } from "@/services/wallet.service";
import { adminDebitSchema } from "@/lib/validations/wallet";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  try {
    const body   = await req.json();
    const parsed = adminDebitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 422 }
      );
    }

    const { amount, description } = parsed.data;
    const result = await adminDebitWallet(userId, amount, description, auth.userId);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Debit failed.";
    console.error("[POST /api/admin/wallets/[userId]/debit]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
