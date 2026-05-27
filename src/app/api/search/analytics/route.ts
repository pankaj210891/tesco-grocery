import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import {
  logSearchClick,
  getPopularSearches,
} from "@/lib/search/search-analytics";
import { searchLimiter, getClientIp, applyRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// ── POST /api/search/analytics — record a click event ────────────────────────

const ClickSchema = z.object({
  query:     z.string().min(1).max(120),
  productId: z.string().min(1),
  position:  z.number().int().min(0).max(99),
});

export async function POST(req: NextRequest) {
  const rl = await applyRateLimit(searchLimiter, getClientIp(req));
  if (rl.limited) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  try {
    const body  = await req.json();
    const parse = ClickSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const { query, productId, position } = parse.data;

    // userId extracted from Authorization header if present (best-effort)
    const auth   = req.headers.get("authorization") ?? "";
    const userId = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;

    // Fire-and-forget — do not await so the response is immediate
    void logSearchClick(query, productId, position, userId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}

// ── GET /api/search/analytics/popular — top searched queries ─────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit      = Math.min(
      Math.max(1, parseInt(limitParam ?? "8", 10) || 8),
      20,
    );

    const queries = await getPopularSearches(limit);
    return NextResponse.json({ success: true, data: { queries } });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
