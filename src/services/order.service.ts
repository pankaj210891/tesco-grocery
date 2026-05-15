import { connectDB } from "@/lib/db/mongoose";
import OrderModel, { type OrderDoc } from "@/lib/db/models/order.model";
import type { Order, PaymentMethodType, PaymentStatus } from "@/types";

export interface OrderItem {
  productId: string;
  name:      string;
  slug:      string;
  price:     number;
  quantity:  number;
  image:     string;
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
  userId?:            string;
  items:              OrderItem[];
  delivery:           DeliveryInfo;
  subtotal:           number;
  deliveryFee:        number;
  codCharge?:         number;
  discount:           number;
  promoCode?:         string;
  total:              number;
  paymentMethod:      PaymentMethodType;
  paymentStatus:      PaymentStatus;
  razorpayOrderId?:   string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
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
      productId?: string | null; name: string; slug?: string | null;
      price: number; quantity: number; image?: string | null;
    }>).map((i) => ({
      productId: i.productId ?? "",
      name:      i.name,
      slug:      i.slug      ?? "",
      price:     i.price,
      quantity:  i.quantity,
      image:     i.image     ?? "",
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
    createdAt:   doc.createdAt.toISOString(),
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
  const orderNumber = generateOrderNumber();
  const doc = await OrderModel.create({ ...input, orderNumber });
  return { orderId: doc._id.toString(), orderNumber: doc.orderNumber };
}
