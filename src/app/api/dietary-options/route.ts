import { connectDB } from "@/lib/db/mongoose";
import DietaryOptionModel from "@/lib/db/models/dietary-option.model";

// GET /api/dietary-options — returns all active dietary options, ordered
export async function GET() {
  try {
    await connectDB();
    const options = await DietaryOptionModel
      .find({ isActive: true })
      .sort({ order: 1, label: 1 })
      .lean();
    return Response.json({ success: true, data: options });
  } catch (err) {
    console.error("[GET /api/dietary-options]", err);
    return Response.json({ success: false, error: "Failed to load dietary options." }, { status: 500 });
  }
}
