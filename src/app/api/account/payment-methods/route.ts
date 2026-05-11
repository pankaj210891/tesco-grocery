import { getAuthUser } from "@/lib/utils/apiAuth";
import { getPaymentMethods, savePaymentMethod } from "@/services/payment.service";
import type { PaymentMethod } from "@/types";

export async function GET(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const methods = await getPaymentMethods(authUser.userId);
    return Response.json({ data: methods });
  } catch (err) {
    console.error("[GET /api/account/payment-methods]", err);
    return Response.json({ error: "Failed to fetch payment methods." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as Omit<PaymentMethod, "_id" | "userId" | "createdAt">;
    const method = await savePaymentMethod(authUser.userId, body);
    return Response.json({ data: method }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/account/payment-methods]", err);
    return Response.json({ error: "Failed to save payment method." }, { status: 500 });
  }
}
