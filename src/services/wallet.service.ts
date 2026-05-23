import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import WalletModel, { type WalletDoc } from "@/lib/db/models/wallet.model";
import WalletTransactionModel, { type WalletTransactionDoc } from "@/lib/db/models/wallet-transaction.model";
import type { Wallet, WalletTransaction, WalletTransactionReason, AdminWalletTransaction } from "@/types";

// ─── Serializers ─────────────────────────────────────────────────────────────

function toWallet(doc: WalletDoc): Wallet {
  return {
    _id:       doc._id.toString(),
    userId:    doc.userId.toString(),
    balance:   Math.round(doc.balance * 100) / 100,
    isActive:  doc.isActive,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

function toTransaction(doc: WalletTransactionDoc): WalletTransaction {
  return {
    _id:         doc._id.toString(),
    walletId:    doc.walletId.toString(),
    userId:      doc.userId.toString(),
    type:        doc.type as "credit" | "debit",
    amount:      Math.round(doc.amount * 100) / 100,
    balanceAfter:Math.round(doc.balanceAfter * 100) / 100,
    reason:      doc.reason as WalletTransactionReason,
    description: doc.description ?? "",
    orderId:     doc.orderId ? doc.orderId.toString() : null,
    orderNumber: doc.orderNumber ?? null,
    performedBy: doc.performedBy ? doc.performedBy.toString() : null,
    status:      doc.status as "completed" | "failed",
    createdAt:   doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

// ─── Get or create wallet (lazy creation) ────────────────────────────────────

export async function getOrCreateWallet(userId: string): Promise<WalletDoc> {
  await connectDB();
  const existing = await WalletModel.findOne({ userId }).lean<WalletDoc>();
  if (existing) return existing;
  const created = await WalletModel.create({ userId, balance: 0 });
  return created.toObject() as WalletDoc;
}

// ─── Public read helpers ──────────────────────────────────────────────────────

export async function getWallet(userId: string): Promise<Wallet> {
  const doc = await getOrCreateWallet(userId);
  return toWallet(doc);
}

export async function getWalletTransactions(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ transactions: WalletTransaction[]; total: number; page: number; totalPages: number }> {
  await connectDB();
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    WalletTransactionModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<WalletTransactionDoc[]>(),
    WalletTransactionModel.countDocuments({ userId }),
  ]);
  return {
    transactions: docs.map(toTransaction),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Topup (user adds money to wallet) ───────────────────────────────────────

export async function topupWallet(
  userId: string,
  amount: number,
  description = "Wallet top-up"
): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const walletDoc = await WalletModel.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount }, $setOnInsert: { isActive: true } },
      { new: true, upsert: true, session }
    ).lean<WalletDoc>();

    if (!walletDoc) throw new Error("Wallet update failed.");

    const txDoc = await WalletTransactionModel.create(
      [{
        walletId:    walletDoc._id,
        userId,
        type:        "credit",
        amount,
        balanceAfter:walletDoc.balance,
        reason:      "topup",
        description,
        status:      "completed",
      }],
      { session }
    );

    await session.commitTransaction();
    return { wallet: toWallet(walletDoc), transaction: toTransaction(txDoc[0].toObject() as WalletTransactionDoc) };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

// ─── Deduct for order payment (atomic) ───────────────────────────────────────

export async function deductWalletForOrder(
  userId:      string,
  amount:      number,
  orderId:     string,
  orderNumber: string,
): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomically deduct only if balance is sufficient (no negative balance)
    const walletDoc = await WalletModel.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true, session }
    ).lean<WalletDoc>();

    if (!walletDoc) {
      throw new Error("Insufficient wallet balance.");
    }

    const txDoc = await WalletTransactionModel.create(
      [{
        walletId:    walletDoc._id,
        userId,
        type:        "debit",
        amount,
        balanceAfter:walletDoc.balance,
        reason:      "order_payment",
        description: `Payment for order ${orderNumber}`,
        orderId,
        orderNumber,
        status:      "completed",
      }],
      { session }
    );

    await session.commitTransaction();
    return { wallet: toWallet(walletDoc), transaction: toTransaction(txDoc[0].toObject() as WalletTransactionDoc) };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

// ─── Refund to wallet (called by order refund flow) ──────────────────────────

export async function refundToWallet(
  userId:      string,
  amount:      number,
  orderId:     string,
  orderNumber: string,
  description = ""
): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const walletDoc = await WalletModel.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount }, $setOnInsert: { isActive: true } },
      { new: true, upsert: true, session }
    ).lean<WalletDoc>();

    if (!walletDoc) throw new Error("Wallet update failed.");

    const txDoc = await WalletTransactionModel.create(
      [{
        walletId:    walletDoc._id,
        userId,
        type:        "credit",
        amount,
        balanceAfter:walletDoc.balance,
        reason:      "refund",
        description: description || `Refund for order ${orderNumber}`,
        orderId,
        orderNumber,
        status:      "completed",
      }],
      { session }
    );

    await session.commitTransaction();
    return { wallet: toWallet(walletDoc), transaction: toTransaction(txDoc[0].toObject() as WalletTransactionDoc) };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

// ─── Admin credit / debit ─────────────────────────────────────────────────────

export async function adminCreditWallet(
  targetUserId: string,
  amount:       number,
  description:  string,
  performedBy:  string,
): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const walletDoc = await WalletModel.findOneAndUpdate(
      { userId: targetUserId },
      { $inc: { balance: amount }, $setOnInsert: { isActive: true } },
      { new: true, upsert: true, session }
    ).lean<WalletDoc>();

    if (!walletDoc) throw new Error("Wallet update failed.");

    const txDoc = await WalletTransactionModel.create(
      [{
        walletId:    walletDoc._id,
        userId:      targetUserId,
        type:        "credit",
        amount,
        balanceAfter:walletDoc.balance,
        reason:      "admin_credit",
        description,
        performedBy,
        status:      "completed",
      }],
      { session }
    );

    await session.commitTransaction();
    return { wallet: toWallet(walletDoc), transaction: toTransaction(txDoc[0].toObject() as WalletTransactionDoc) };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

export async function adminDebitWallet(
  targetUserId: string,
  amount:       number,
  description:  string,
  performedBy:  string,
): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const walletDoc = await WalletModel.findOneAndUpdate(
      { userId: targetUserId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true, session }
    ).lean<WalletDoc>();

    if (!walletDoc) throw new Error("Insufficient wallet balance.");

    const txDoc = await WalletTransactionModel.create(
      [{
        walletId:    walletDoc._id,
        userId:      targetUserId,
        type:        "debit",
        amount,
        balanceAfter:walletDoc.balance,
        reason:      "admin_debit",
        description,
        performedBy,
        status:      "completed",
      }],
      { session }
    );

    await session.commitTransaction();
    return { wallet: toWallet(walletDoc), transaction: toTransaction(txDoc[0].toObject() as WalletTransactionDoc) };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

// ─── Admin: paginated list of all user wallets ────────────────────────────────

export interface AdminWalletRow {
  walletId:    string;
  userId:      string;
  userName:    string;
  userEmail:   string;
  balance:     number;
  isActive:    boolean;
  lastTopupAt: string | null;
  createdAt:   string;
}

export async function listAllWallets(
  page   = 1,
  limit  = 20,
  search = ""
): Promise<{ wallets: AdminWalletRow[]; total: number; page: number; totalPages: number }> {
  await connectDB();

  const skip = (page - 1) * limit;

  // Build the optional user-name/email match stage for the $lookup pipeline
  const userMatchStage = search
    ? {
        $match: {
          $or: [
            { "user.name":  { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
          ],
        },
      }
    : null;

  // Aggregate: wallets → lookup user → optional search → sort → paginate
  const pipeline: mongoose.PipelineStage[] = [
    {
      $lookup: {
        from:         "users",
        localField:   "userId",
        foreignField: "_id",
        as:           "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
    ...(userMatchStage ? [userMatchStage] : []),
    { $sort: { "user.name": 1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "wallettransactions",
              let:  { wid: "$_id" },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$walletId", "$$wid"] }, { $eq: ["$reason", "topup"] }] } } },
                { $sort:  { createdAt: -1 } },
                { $limit: 1 },
                { $project: { createdAt: 1 } },
              ],
              as: "lastTopupArr",
            },
          },
        ],
        count: [{ $count: "n" }],
      },
    },
  ];

  type FacetResult = {
    data: Array<{
      _id:          mongoose.Types.ObjectId;
      userId:       mongoose.Types.ObjectId;
      balance:      number;
      isActive:     boolean;
      createdAt:    Date;
      user:         { _id: mongoose.Types.ObjectId; name: string; email: string };
      lastTopupArr: Array<{ createdAt: Date }>;
    }>;
    count: Array<{ n: number }>;
  };

  const [result] = await WalletModel.aggregate<FacetResult>(pipeline);
  const rows = result?.data ?? [];
  const total = result?.count[0]?.n ?? 0;

  const wallets: AdminWalletRow[] = rows.map((row) => ({
    walletId:    row._id.toString(),
    userId:      row.userId.toString(),
    userName:    row.user.name,
    userEmail:   row.user.email,
    balance:     Math.round(row.balance * 100) / 100,
    isActive:    row.isActive,
    lastTopupAt: row.lastTopupArr[0]?.createdAt?.toISOString() ?? null,
    createdAt:   row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }));

  return {
    wallets,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Admin: transactions for a specific user (with resolved performedBy name) ─

export async function adminGetUserTransactions(
  userId: string,
  page    = 1,
  limit   = 20,
): Promise<{
  transactions: AdminWalletTransaction[];
  total:        number;
  page:         number;
  totalPages:   number;
}> {
  await connectDB();

  const skip = (page - 1) * limit;

  type AggRow = WalletTransactionDoc & {
    performedByUser: Array<{ name: string }>;
  };

  const [docs, total] = await Promise.all([
    WalletTransactionModel.aggregate<AggRow>([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort:  { createdAt: -1 } },
      { $skip:  skip },
      { $limit: limit },
      {
        $lookup: {
          from:         "users",
          localField:   "performedBy",
          foreignField: "_id",
          as:           "performedByUser",
          pipeline:     [{ $project: { name: 1 } }],
        },
      },
    ]),
    WalletTransactionModel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
  ]);

  const transactions: AdminWalletTransaction[] = docs.map((doc) => ({
    ...toTransaction(doc),
    performedByName: doc.performedByUser[0]?.name ?? null,
  }));

  return { transactions, total, page, totalPages: Math.ceil(total / limit) };
}
