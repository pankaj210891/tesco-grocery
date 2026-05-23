import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import OrderModel, { type OrderDoc } from "@/lib/db/models/order.model";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import VendorEarningModel from "@/lib/db/models/vendor-earning.model";
import ProductModel from "@/lib/db/models/product.model";
import { getConfig, getRateForVendor } from "@/services/commission.service";
import { buildVendorOrderDocs, type CreateVendorOrderInput } from "@/services/vendor-order.service";
import type {
  Order,
  ParentOrderStatus,
  PaymentMethodType,
  PaymentStatus,
  RefundStatus,
  VendorOrderItem,
} from "@/types";

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
  walletAmount?:       number;
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
  orderId:        string;
  orderNumber:    string;
  vendorOrderIds: string[];
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
    items: (doc.items as Array<{
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
    subtotal:     doc.subtotal,
    deliveryFee:  doc.deliveryFee,
    codCharge:    (doc as unknown as { codCharge?: number }).codCharge ?? 0,
    discount:     doc.discount ?? 0,
    promoCode:    doc.promoCode ?? undefined,
    total:        doc.total,
    walletAmount: (doc as unknown as { walletAmount?: number }).walletAmount ?? 0,
    status:        doc.status as ParentOrderStatus,
    paymentMethod: doc.paymentMethod as PaymentMethodType,
    paymentStatus: (doc.paymentStatus ?? "pending") as PaymentStatus,
    razorpayOrderId:   doc.razorpayOrderId   ?? undefined,
    razorpayPaymentId: doc.razorpayPaymentId ?? undefined,
    cancellationReason:  (doc as unknown as { cancellationReason?: string }).cancellationReason  ?? undefined,
    cancellationComment: (doc as unknown as { cancellationComment?: string }).cancellationComment ?? undefined,
    refundId:     (doc as unknown as { refundId?: string }).refundId      ?? undefined,
    refundStatus: (doc as unknown as { refundStatus?: string }).refundStatus as RefundStatus | undefined,
    vendorOrderIds: ((doc as unknown as { vendorOrderIds?: Array<{ toString(): string }> }).vendorOrderIds ?? []).map((id) => id.toString()),
    createdAt:   doc.createdAt.toISOString(),
    updatedAt:   (doc as unknown as { updatedAt?: Date }).updatedAt?.toISOString() ?? doc.createdAt.toISOString(),
  };
}

export interface OrderDateFilter {
  from?: string;
  to?:   string;
}

export async function getOrdersByUserId(
  userId: string,
  dateFilter?: OrderDateFilter,
): Promise<Order[]> {
  await connectDB();

  const query: Record<string, unknown> = { userId };
  if (dateFilter?.from || dateFilter?.to) {
    const range: Record<string, Date> = {};
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

// ─── Transaction-safe order creation ─────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  const mongoConn = await connectDB();

  // Resolve vendor info + commission rates for all items before starting the session
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

  // Enrich items with vendor info and commission
  const enrichedItems = input.items.map((item) => {
    const meta         = vendorMap.get(item.productId) ?? { vendorId: null, vendorName: null };
    const vendorId     = item.vendorId ?? meta.vendorId;
    const vendorName   = item.vendorName ?? meta.vendorName;
    const rate         = getRateForVendor(vendorId, commissionConfig);
    const lineTotal    = item.price * item.quantity;
    const commission   = vendorId ? Math.round(lineTotal * rate) / 100 : 0;

    return {
      ...item,
      vendorId,
      vendorName,
      commissionRate:   vendorId ? rate : 0,
      commissionAmount: commission,
      vendorEarning:    lineTotal - commission,
    };
  });

  // Group enriched items by vendor
  const vendorGroups = new Map<string, typeof enrichedItems>();
  for (const item of enrichedItems) {
    if (!item.vendorId) continue;
    if (!vendorGroups.has(item.vendorId)) vendorGroups.set(item.vendorId, []);
    vendorGroups.get(item.vendorId)!.push(item);
  }

  const orderNumber = generateOrderNumber();

  // ── MongoDB session / transaction ─────────────────────────────────────────
  const session = await mongoConn.startSession();

  let orderId        = "";
  let vendorOrderIds: string[] = [];

  try {
    await session.withTransaction(async () => {
      // 1. Create parent order
      const [orderDoc] = await OrderModel.create(
        [{ ...input, items: enrichedItems, orderNumber }],
        { session },
      );
      orderId = orderDoc._id.toString();

      // 2. Build vendor sub-order inputs
      if (vendorGroups.size > 0) {
        const vendorInputs: CreateVendorOrderInput[] = Array.from(vendorGroups.entries()).map(
          ([vid, items]) => {
            const vendorName    = items[0].vendorName ?? vid;
            const subtotal      = items.reduce((s, i) => s + i.price * i.quantity, 0);
            const commTotal     = items.reduce((s, i) => s + (i.commissionAmount ?? 0), 0);
            const vendorEarning = items.reduce((s, i) => s + (i.vendorEarning ?? 0), 0);

            return {
              parentOrderId:     orderDoc._id,
              parentOrderNumber: orderNumber,
              vendorId:          vid,
              vendorName,
              customerId:        input.userId ?? null,
              items:             items as unknown as VendorOrderItem[],
              subtotal:          Math.round(subtotal * 100) / 100,
              commissionTotal:   Math.round(commTotal * 100) / 100,
              vendorEarning:     Math.round(vendorEarning * 100) / 100,
            };
          },
        );

        // 3. Create vendor sub-orders
        const vendorOrderDocs = buildVendorOrderDocs(vendorInputs);
        const createdVendorOrders = await VendorOrderModel.insertMany(
          vendorOrderDocs,
          { session },
        );
        vendorOrderIds = createdVendorOrders.map((vo) => vo._id.toString());

        // 4. Link vendor order IDs back to parent order
        await OrderModel.findByIdAndUpdate(
          orderId,
          { vendorOrderIds: createdVendorOrders.map((vo) => vo._id) },
          { session },
        );

        // 5. Decrement stock atomically inside the transaction
        const stockUpdates = enrichedItems
          .filter((i) => i.vendorId)
          .map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity }));

        if (stockUpdates.length > 0) {
          await Promise.all(
            stockUpdates.map((item) => {
              if (item.variantId) {
                const variantObjId = new mongoose.Types.ObjectId(item.variantId);
                return ProductModel.findOneAndUpdate(
                  {
                    _id:      item.productId,
                    variants: { $elemMatch: { _id: variantObjId, stockQuantity: { $gte: item.quantity } } },
                  },
                  { $inc: { "variants.$.stockQuantity": -item.quantity } },
                  { session, new: true },
                );
              }
              return ProductModel.findOneAndUpdate(
                { _id: item.productId, stockQuantity: { $gte: item.quantity } },
                { $inc: { stockQuantity: -item.quantity } },
                { session, new: true },
              );
            }),
          );
        }

        // 6. Create earnings ledger entries inside the transaction
        const earningDocs = vendorInputs.map((vi, idx) => ({
          vendorId:        new mongoose.Types.ObjectId(vi.vendorId),
          orderId:         orderDoc._id,
          orderNumber,
          orderDate:       new Date(),
          items:           vi.items.map((i) => ({
            productId:        i.productId,
            name:             i.name,
            quantity:         i.quantity,
            price:            i.price,
            commissionRate:   i.commissionRate,
            commissionAmount: i.commissionAmount,
            netEarning:       i.vendorEarning,
          })),
          grossAmount:     vi.subtotal,
          commissionTotal: vi.commissionTotal,
          netAmount:       vi.vendorEarning,
          status:          "pending" as const,
          // Link to vendor order
          vendorOrderId:   createdVendorOrders[idx]?._id ?? null,
        }));

        const createdEarnings = await VendorEarningModel.insertMany(earningDocs, { session });

        // 7. Link earning ID to each vendor order
        await Promise.all(
          createdVendorOrders.map((vo, idx) =>
            VendorOrderModel.findByIdAndUpdate(
              vo._id,
              { earningId: createdEarnings[idx]?._id ?? null },
              { session },
            ),
          ),
        );
      }
    });
  } finally {
    await session.endSession();
  }

  // Post-transaction: mark out-of-stock products (non-critical, fire-and-forget)
  void markOutOfStockProducts(enrichedItems);

  // Fire-and-forget: notify each vendor of their new sub-order
  void fireVendorNewOrderNotifications(orderId, orderNumber, vendorGroups);

  return { orderId, orderNumber, vendorOrderIds };
}

async function fireVendorNewOrderNotifications(
  parentOrderId:  string,
  orderNumber:    string,
  vendorGroups:   Map<string, Array<{ vendorId: string | null; vendorName: string | null; price: number; quantity: number; name: string }>>,
): Promise<void> {
  try {
    const VendorModel = (await import("@/lib/db/models/vendor.model")).default;
    await connectDB();

    const vendorIds = Array.from(vendorGroups.keys());
    const vendors = await VendorModel
      .find({ _id: { $in: vendorIds } })
      .select("_id email name")
      .lean<Array<{ _id: { toString(): string }; email: string; name: string }>>();

    const { sendVendorNewOrder } = await import("@/services/email.service");
    const dashboardBase = process.env.NEXT_PUBLIC_APP_URL ?? "";

    await Promise.allSettled(
      vendors.map(async (vendor) => {
        const items = vendorGroups.get(vendor._id.toString()) ?? [];
        await sendVendorNewOrder(vendor.email, {
          vendorName:        vendor.name,
          vendorOrderId:     parentOrderId,
          parentOrderNumber: orderNumber,
          items:             items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
          subtotal:          items.reduce((s, i) => s + i.price * i.quantity, 0),
          dashboardUrl:      `${dashboardBase}/vendor/orders`,
        });
      }),
    );
  } catch (err) {
    console.error("[order] Failed to send vendor new-order notifications:", err);
  }
}

async function markOutOfStockProducts(
  items: Array<{ productId: string; variantId?: string | null; quantity: number }>,
): Promise<void> {
  try {
    await Promise.all(
      items.map(async (item) => {
        if (item.variantId) {
          const variantObjId = new mongoose.Types.ObjectId(item.variantId);
          const product = await ProductModel
            .findOne({ _id: item.productId, "variants._id": variantObjId })
            .select("variants.$")
            .lean<{ variants?: Array<{ _id: unknown; stockQuantity?: number | null }> }>();
          const v = product?.variants?.[0];
          if (v && typeof v.stockQuantity === "number" && v.stockQuantity <= 0) {
            await ProductModel.findOneAndUpdate(
              { _id: item.productId, "variants._id": variantObjId },
              { $set: { "variants.$.inStock": false } },
            );
          }
          return;
        }
        const product = await ProductModel.findById(item.productId).select("stockQuantity").lean<{ stockQuantity?: number | null }>();
        if (product && typeof product.stockQuantity === "number" && product.stockQuantity <= 0) {
          await ProductModel.findByIdAndUpdate(item.productId, { inStock: false });
        }
      }),
    );
  } catch (err) {
    console.error("[order] Failed to mark out-of-stock products:", err);
  }
}

// ─── Cancellation ─────────────────────────────────────────────────────────────

export const CANCELLABLE_STATUSES: ParentOrderStatus[] = [
  "pending",
  "processing",
  "partially_confirmed",
];

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
