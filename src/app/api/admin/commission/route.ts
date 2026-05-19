import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { getConfigWithVendorNames, updateConfig } from "@/services/commission.service";

const updateSchema = z.object({
  defaultRate: z.number().min(0).max(100).optional(),
  vendorRates: z
    .array(
      z.object({
        vendorId: z.string().min(1),
        rate:     z.number().min(0).max(100),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const config = await getConfigWithVendorNames();
  return NextResponse.json({ success: true, data: config });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const updated = await updateConfig(parsed.data);
  return NextResponse.json({ success: true, data: updated });
}
