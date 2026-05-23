import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { listAllWallets } from "@/services/wallet.service";
import { z } from "zod";

const querySchema = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 }
    );
  }

  try {
    const { page, limit, search } = parsed.data;
    const result = await listAllWallets(page, limit, search ?? "");
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[GET /api/admin/wallets]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch wallets." }, { status: 500 });
  }
}
