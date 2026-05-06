import { getAuthUser } from "@/lib/utils/apiAuth";
import { getWishlistProducts, addToWishlist } from "@/services/wishlist.service";

export async function GET(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const products = await getWishlistProducts(authUser.userId);
    return Response.json({ data: products });
  } catch (err) {
    console.error("[GET /api/account/wishlist]", err);
    return Response.json({ error: "Failed to fetch wishlist." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productId } = await req.json() as { productId?: string };
    if (!productId) return Response.json({ error: "productId required." }, { status: 400 });

    await addToWishlist(authUser.userId, productId);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[POST /api/account/wishlist]", err);
    return Response.json({ error: "Failed to update wishlist." }, { status: 500 });
  }
}
