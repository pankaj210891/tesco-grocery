import { getAuthUser } from "@/lib/utils/apiAuth";
import { getOrderByNumber } from "@/services/order.service";
import { getVendorOrdersByParentOrder } from "@/services/vendor-order.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderNumber } = await params;

  try {
    const order = await getOrderByNumber(orderNumber, authUser.userId);
    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    // Include vendor sub-orders so the customer can see per-vendor tracking
    const vendorOrders = order._id
      ? await getVendorOrdersByParentOrder(order._id)
      : [];

    return Response.json({ data: { ...order, vendorOrders } });
  } catch (err) {
    console.error("[GET /api/account/orders/[orderNumber]]", err);
    return Response.json({ error: "Failed to fetch order." }, { status: 500 });
  }
}
