import { connectDB } from "@/lib/db/mongoose";
import ProductModel from "@/lib/db/models/product.model";
import { mockAllProducts } from "@/lib/data/mock-products";

// POST /api/seed — seeds the DB from mock data. Development only.
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    await connectDB();

    await ProductModel.deleteMany({});

    // Pick only DB-relevant fields; zero out rating/reviewCount — the review system owns those
    const docs = mockAllProducts.map(({ name, slug, description, price, originalPrice, images, category, brand, unit, inStock, tags }) => ({
      name, slug, description, price, originalPrice, images, category, brand, unit, inStock, tags,
      rating:      0,
      reviewCount: 0,
    }));
    const inserted = await ProductModel.insertMany(docs);

    return Response.json({
      success: true,
      message: `Seeded ${inserted.length} products into the database.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
