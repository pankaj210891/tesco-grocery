import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import CartModel from "@/lib/db/models/cart.model";

// DELETE /api/account/cart/[productId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { productId } = await params;
  try {
    await connectDB();
    await CartModel.findOneAndUpdate(
      { userId: auth.userId },
      { $pull: { items: { productId } } },
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cart item DELETE]", err);
    return NextResponse.json({ success: false, error: "Failed to remove item" }, { status: 500 });
  }
}
