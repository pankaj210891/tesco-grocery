import { getAuthUser } from "@/lib/utils/apiAuth";
import { removeFromWishlist } from "@/services/wishlist.service";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;

  try {
    await removeFromWishlist(authUser.userId, productId);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/account/wishlist/[productId]]", err);
    return Response.json({ error: "Failed to remove from wishlist." }, { status: 500 });
  }
}
