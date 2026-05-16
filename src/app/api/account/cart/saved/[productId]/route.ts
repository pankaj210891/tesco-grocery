import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import CartModel from "@/lib/db/models/cart.model";

// DELETE /api/account/cart/saved/[productId]  — remove from saved items
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
      { $pull: { savedItems: { productId } } }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cart saved DELETE]", err);
    return NextResponse.json({ success: false, error: "Failed to remove saved item" }, { status: 500 });
  }
}
