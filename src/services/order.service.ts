import { connectDB, isDBConfigured } from "@/lib/db/mongoose";
import OrderModel from "@/lib/db/models/order.model";

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
