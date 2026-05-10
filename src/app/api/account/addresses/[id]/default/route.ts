import { getAuthUser } from "@/lib/utils/apiAuth";
import { setDefaultAddress } from "@/services/address.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const address = await setDefaultAddress(authUser.userId, id);
    if (!address) return Response.json({ error: "Address not found." }, { status: 404 });
    return Response.json({ data: address });
  } catch (err) {
    console.error("[PATCH /api/account/addresses/[id]/default]", err);
    return Response.json({ error: "Failed to set default address." }, { status: 500 });
  }
}
