import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { releaseEarning } from "@/services/vendor-earning.service";

const releaseSchema = z.object({
  payoutRef: z.string().trim().max(100).optional().default(""),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

  const parsed = releaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const earning = await releaseEarning(id, parsed.data.payoutRef);
  if (!earning) {
    return NextResponse.json(
      { success: false, error: "Earning not found or not in confirmed state" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: earning });
}
