import { getAuthUser } from "@/lib/utils/apiAuth";
import { deletePaymentMethod } from "@/services/payment.service";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const deleted = await deletePaymentMethod(authUser.userId, id);
    if (!deleted) return Response.json({ error: "Payment method not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/account/payment-methods/[id]]", err);
    return Response.json({ error: "Failed to delete payment method." }, { status: 500 });
  }
}
