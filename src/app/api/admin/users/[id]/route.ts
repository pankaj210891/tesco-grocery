import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import UserModel from "@/lib/db/models/user.model";
import AddressModel from "@/lib/db/models/address.model";
import OrderModel from "@/lib/db/models/order.model";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    const uid = new mongoose.Types.ObjectId(id);

    const [user, addresses, recentOrders, analyticsResult] = await Promise.all([
      UserModel.findById(id).select("-password").lean(),
      AddressModel.find({ userId: uid }).sort({ isDefault: -1, createdAt: -1 }).lean(),
      OrderModel.find({ userId: uid }).sort({ createdAt: -1 }).limit(10).lean(),
      OrderModel.aggregate([
        { $match: { userId: uid } },
        {
          $group: {
            _id:             null,
            totalOrders:     { $sum: 1 },
            totalSpent:      { $sum: "$total" },
            cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            refundedOrders:  {
              $sum: {
                $cond: [{ $in: ["$paymentStatus", ["refunded", "partially_refunded"]] }, 1, 0],
              },
            },
            lastOrderDate: { $max: "$createdAt" },
          },
        },
      ]),
    ]);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const analytics = analyticsResult[0] ?? {
      totalOrders: 0, totalSpent: 0,
      cancelledOrders: 0, refundedOrders: 0, lastOrderDate: null,
    };

    return NextResponse.json({
      success: true,
      data: { ...user, addresses, orders: recentOrders, analytics },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch user details" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (id === auth.userId) {
      return NextResponse.json({ success: false, error: "Cannot modify your own account" }, { status: 400 });
    }

    const body = await req.json() as { role?: string; status?: string };
    const update: Record<string, string> = {};
    if (body.role   && ["customer", "vendor", "admin"].includes(body.role))     update.role   = body.role;
    if (body.status && ["active", "suspended"].includes(body.status)) update.status = body.status;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 422 });
    }

    const user = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select("-password");
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
