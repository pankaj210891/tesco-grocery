import { connectDB, isDBConfigured } from "@/lib/db/mongoose";
import OrderModel, { type OrderDoc } from "@/lib/db/models/order.model";
import type { Order } from "@/types";

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
  userId?:     string;
  items:       OrderItem[];
  delivery:    DeliveryInfo;
  subtotal:    number;
  deliveryFee: number;
  discount:    number;
  promoCode?:  string;
  total:       number;
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

const MOCK_ORDERS: Order[] = [
  {
    _id:         "demo-order-1",
    orderNumber: "ORD-20260507-DEMO",
    items: [
      { productId: "p1", name: "Tesco Whole Milk 2L",   slug: "tesco-whole-milk-2l",    price: 1.35, quantity: 2, image: "" },
      { productId: "p2", name: "Warburtons Medium Sliced White Bread", slug: "warburtons-white-bread", price: 1.20, quantity: 1, image: "" },
    ],
    delivery:    { fullName: "Demo User", email: "demo@example.com", phone: "07700900000", address: "1 Demo Street", city: "London", postcode: "SW1A 1AA" },
    subtotal:    3.90,
    deliveryFee: 0,
    discount:    0,
    total:       3.90,
    status:      "delivered",
    createdAt:   new Date(Date.now() - 7 * 86400_000).toISOString(),
  },
];

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
    delivery:    {
      fullName: doc.delivery?.fullName ?? "",
      email:    doc.delivery?.email    ?? "",
      phone:    doc.delivery?.phone    ?? "",
      address:  doc.delivery?.address  ?? "",
      city:     doc.delivery?.city     ?? "",
      postcode: doc.delivery?.postcode ?? "",
    },
    subtotal:    doc.subtotal,
    deliveryFee: doc.deliveryFee,
    discount:    doc.discount ?? 0,
    promoCode:   doc.promoCode ?? undefined,
    total:       doc.total,
    status:      doc.status as Order["status"],
    createdAt:   doc.createdAt.toISOString(),
  };
}

export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  if (!isDBConfigured()) return MOCK_ORDERS;
  await connectDB();
  const docs = await OrderModel
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return (docs as unknown as (OrderDoc & { _id: { toString(): string }; createdAt: Date })[]).map(toOrder);
}

export async function getOrderByNumber(orderNumber: string, userId: string): Promise<Order | null> {
  if (!isDBConfigured()) {
    return MOCK_ORDERS.find((o) => o.orderNumber === orderNumber) ?? null;
  }
  await connectDB();
  const doc = await OrderModel.findOne({ orderNumber, userId }).lean();
  if (!doc) return null;
  return toOrder(doc as unknown as OrderDoc & { _id: { toString(): string }; createdAt: Date });
}

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  const orderNumber = generateOrderNumber();

  if (!isDBConfigured()) {
    // Demo mode — return a mock order without DB
    return { orderId: `demo-${Date.now()}`, orderNumber };
  }

  await connectDB();

  const doc = await OrderModel.create({ ...input, orderNumber });
  return { orderId: doc._id.toString(), orderNumber: doc.orderNumber };
}
