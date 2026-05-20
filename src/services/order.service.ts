import { connectDB } from "@/lib/db/mongoose";
import OrderModel, { type OrderDoc } from "@/lib/db/models/order.model";
import ProductModel from "@/lib/db/models/product.model";
import { getConfig, getRateForVendor } from "@/services/commission.service";
import { createEarningsForOrder } from "@/services/vendor-earning.service";
import type { Order, PaymentMethodType, PaymentStatus, RefundStatus } from "@/types";

export interface OrderItem {
  productId:         string;
  variantId?:        string | null;
  variantLabel?:     string | null;
  vendorId?:         string | null;
  vendorName?:       string | null;
  name:              string;
  slug:              string;
  price:             number;
  quantity:          number;
  image:             string;
  commissionRate?:   number;
  commissionAmount?: number;
  vendorEarning?:    number;
}

export interface DeliveryInfo {
  fullName: string;
  email:    string;
  phone:    string;
  address:  string;
  city:     string;
  postcode: string;
}

export interface CreateOrderInput {
  userId?:             string;
  items:               OrderItem[];
  delivery:            DeliveryInfo;
  subtotal:            number;
  deliveryFee:         number;
  codCharge?:          number;
  discount:            number;
  promoCode?:          string;
  total:               number;
  paymentMethod:       PaymentMethodType;
  paymentStatus:       PaymentStatus;
  razorpayOrderId?:    string;
  razorpayPaymentId?:  string;
  razorpaySignature?:  string;
  deliverySlotId?:     string;
  deliverySlotDate?:   string;
  deliverySlotWindow?: string;
}

export interface OrderResult {
  orderId:     string;
  orderNumber: string;
}

function generateOrderNumber(): string {
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `ORD-${date}-${random}`;
}

function toOrder(doc: OrderDoc & { _id: { toString(): string }; createdAt: Date }): Order {
  return {
    _id:         doc._id.toString(),
    orderNumber: doc.orderNumber,
    items:       (doc.items as Array<{
      productId?: string | null; variantId?: string | null; variantLabel?: string | null;
      vendorId?: { toString(): string } | null; vendorName?: string | null;
      name: string; slug?: string | null; price: number; quantity: number; image?: string | null;
      commissionRate?: number; commissionAmount?: number; vendorEarning?: number;
    }>).map((i) => ({
      productId:        i.productId        ?? "",
      variantId:        i.variantId        ?? null,
      variantLabel:     i.variantLabel     ?? null,
      vendorId:         i.vendorId?.toString() ?? null,
      vendorName:       i.vendorName       ?? null,
      name:             i.name,
      slug:             i.slug             ?? "",
      price:            i.price,
      quantity:         i.quantity,
      image:            i.image            ?? "",
      commissionRate:   i.commissionRate   ?? 0,
      commissionAmount: i.commissionAmount ?? 0,
      vendorEarning:    i.vendorEarning    ?? 0,
    })),
    delivery: {
      fullName: doc.delivery?.fullName ?? "",
      email:    doc.delivery?.email    ?? "",
      phone:    doc.delivery?.phone    ?? "",
      address:  doc.delivery?.address  ?? "",
      city:     doc.delivery?.city     ?? "",
      postcode: doc.delivery?.postcode ?? "",
    },
    subtotal:    doc.subtotal,
    deliveryFee: doc.deliveryFee,
    codCharge:   (doc as unknown as { codCharge?: number }).codCharge ?? 0,
    discount:    doc.discount ?? 0,
    promoCode:   doc.promoCode ?? undefined,
    total:       doc.total,
    status:        doc.status as Order["status"],
    paymentMethod: doc.paymentMethod as PaymentMethodType,
    paymentStatus: (doc.paymentStatus ?? "pending") as PaymentStatus,
    razorpayOrderId:   doc.razorpayOrderId ?? undefined,
    razorpayPaymentId: doc.razorpayPaymentId ?? undefined,
    cancellationReason:  (doc as unknown as { cancellationReason?: string }).cancellationReason  ?? undefined,
    cancellationComment: (doc as unknown as { cancellationComment?: string }).cancellationComment ?? undefined,
    refundId:     (doc as unknown as { refundId?: string }).refundId      ?? undefined,
    refundStatus: (doc as unknown as { refundStatus?: string }).refundStatus as RefundStatus | undefined,
    createdAt:   doc.createdAt.toISOString(),
    updatedAt:   (doc as unknown as { updatedAt?: Date }).updatedAt?.toISOString() ?? doc.createdAt.toISOString(),
  };
}

export interface OrderDateFilter {
  from?: string; // ISO date string
  to?:   string; // ISO date string
}

export async function getOrdersByUserId(
  userId: string,
  dateFilter?: OrderDateFilter,
): Promise<Order[]> {
  await connectDB();

  const query: Record<string, unknown> = { userId };
  if (dateFilter?.from || dateFilter?.to) {
    const range: Record<string, Date> = {};
    // YYYY-MM-DD strings from client; interpret as IST (UTC+05:30) day boundaries
    if (dateFilter.from) range.$gte = new Date(`${dateFilter.from}T00:00:00+05:30`);
    if (dateFilter.to)   range.$lte = new Date(`${dateFilter.to}T23:59:59.999+05:30`);
    query.createdAt = range;
  }

  const docs = await OrderModel
    .find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return (docs as unknown as (OrderDoc & { _id: { toString(): string }; createdAt: Date })[]).map(toOrder);
}

export async function getOrderByNumber(orderNumber: string, userId: string): Promise<Order | null> {
  await connectDB();
  const doc = await OrderModel.findOne({ orderNumber, userId }).lean();
  if (!doc) return null;
  return toOrder(doc as unknown as OrderDoc & { _id: { toString(): string }; createdAt: Date });
}

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  await connectDB();

  // Resolve vendorId/vendorName from product catalogue and compute commission per item
  const productIds = input.items.map((i) => i.productId).filter(Boolean);
  const [productDocs, commissionConfig] = await Promise.all([
    ProductModel.find({ _id: { $in: productIds } })
      .select("_id vendorId vendorName")
      .lean<Array<{ _id: { toString(): string }; vendorId?: { toString(): string } | null; vendorName?: string | null }>>(),
    getConfig(),
  ]);

  const vendorMap = new Map(productDocs.map((p) => [
    p._id.toString(),
    { vendorId: p.vendorId?.toString() ?? null, vendorName: p.vendorName ?? null },
  ]));

  const enrichedItems = input.items.map((item) => {
    const meta          = vendorMap.get(item.productId) ?? { vendorId: null, vendorName: null };
    const vendorId      = item.vendorId ?? meta.vendorId;
    const vendorName    = item.vendorName ?? meta.vendorName;
    const rate          = getRateForVendor(vendorId, commissionConfig);
    const lineTotal     = item.price * item.quantity;
    const commission    = vendorId ? Math.round(lineTotal * rate) / 100 : 0;

    return {
      ...item,
      vendorId,
      vendorName,
      commissionRate:   vendorId ? rate : 0,
      commissionAmount: commission,
      vendorEarning:    lineTotal - commission,
    };
  });

  const orderNumber = generateOrderNumber();
  const doc = await OrderModel.create({ ...input, items: enrichedItems, orderNumber });

  // Fire-and-forget — build earnings ledger entries asynchronously
  void createEarningsForOrder(doc._id.toString());

  return { orderId: doc._id.toString(), orderNumber: doc.orderNumber };
}

export const CANCELLABLE_STATUSES = ["pending", "processing"] as const;

export async function cancelOrder(
  orderNumber: string,
  userId:      string,
  reason?:     string,
  comment?:    string,
): Promise<Order | null> {
  await connectDB();
  const doc = await OrderModel.findOneAndUpdate(
    { orderNumber, userId, status: { $in: CANCELLABLE_STATUSES } },
    {
      status: "cancelled",
      ...(reason  && { cancellationReason: reason }),
      ...(comment && { cancellationComment: comment }),
    },
    { new: true },
  ).lean();
  if (!doc) return null;
  return toOrder(doc as unknown as OrderDoc & { _id: { toString(): string }; createdAt: Date });
}

export async function setOrderRefund(
  orderNumber: string,
  refundId:    string,
  status:      RefundStatus,
): Promise<void> {
  await connectDB();
  const update: Record<string, unknown> = { refundId, refundStatus: status };
  if (status === "processed") update.paymentStatus = "refunded";
  await OrderModel.updateOne({ orderNumber }, update);
}

export async function getOrderByRefundId(refundId: string): Promise<Order | null> {
  await connectDB();
  const doc = await OrderModel.findOne({ refundId }).lean();
  if (!doc) return null;
  return toOrder(doc as unknown as OrderDoc & { _id: { toString(): string }; createdAt: Date });
}
