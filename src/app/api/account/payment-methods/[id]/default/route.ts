import { getAuthUser } from "@/lib/utils/apiAuth";
import { setDefaultPaymentMethod } from "@/services/payment.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const method = await setDefaultPaymentMethod(authUser.userId, id);
    if (!method) return Response.json({ error: "Payment method not found." }, { status: 404 });
    return Response.json({ data: method });
  } catch (err) {
    console.error("[PATCH /api/account/payment-methods/[id]/default]", err);
    return Response.json({ error: "Failed to set default payment method." }, { status: 500 });
  }
}
