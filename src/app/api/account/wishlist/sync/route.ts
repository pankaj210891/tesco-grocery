import { getAuthUser } from "@/lib/utils/apiAuth";
import { syncWishlist } from "@/services/wishlist.service";

export async function PUT(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as { productIds?: string[] };
    const localIds = Array.isArray(body.productIds) ? body.productIds : [];

    const mergedProducts = await syncWishlist(authUser.userId, localIds);
    return Response.json({ data: mergedProducts });
  } catch (err) {
    console.error("[PUT /api/account/wishlist/sync]", err);
    return Response.json({ error: "Failed to sync wishlist." }, { status: 500 });
  }
}
