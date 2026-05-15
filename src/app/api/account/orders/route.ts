import { getAuthUser } from "@/lib/utils/apiAuth";
import { getOrdersByUserId } from "@/services/order.service";

export async function GET(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? undefined;
    const to   = searchParams.get("to")   ?? undefined;

    const orders = await getOrdersByUserId(authUser.userId, { from, to });
    return Response.json({ data: orders });
  } catch (err) {
    console.error("[GET /api/account/orders]", err);
    return Response.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}
