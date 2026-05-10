import { getAuthUser } from "@/lib/utils/apiAuth";
import { updateAddress, deleteAddress } from "@/services/address.service";
import type { Address } from "@/types";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json() as Partial<Omit<Address, "_id" | "userId" | "createdAt">>;
    const address = await updateAddress(authUser.userId, id, body);
    if (!address) return Response.json({ error: "Address not found." }, { status: 404 });
    return Response.json({ data: address });
  } catch (err) {
    console.error("[PUT /api/account/addresses/[id]]", err);
    return Response.json({ error: "Failed to update address." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const deleted = await deleteAddress(authUser.userId, id);
    if (!deleted) return Response.json({ error: "Address not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/account/addresses/[id]]", err);
    return Response.json({ error: "Failed to delete address." }, { status: 500 });
  }
}
