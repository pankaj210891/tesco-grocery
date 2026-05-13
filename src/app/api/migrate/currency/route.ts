/**
 * Currency Migration: GBP → INR
 *
 * GET  /api/migrate/currency          — check migration status
 * POST /api/migrate/currency          — apply migration  (multiply by conversionRate)
 * DELETE /api/migrate/currency        — rollback migration (divide by conversionRate)
 *
 * A migrations collection tracks applied migrations to prevent double conversion.
 * Protected: requires MIGRATION_SECRET header matching MIGRATION_SECRET env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import mongoose, { Schema } from "mongoose";

// ── Config ────────────────────────────────────────────────────────────────────

const MIGRATION_ID    = "gbp-to-inr-v1";
const DEFAULT_RATE    = 106; // 1 GBP = 106 INR (configurable via query param)

// ── Migration tracking schema ─────────────────────────────────────────────────

const MigrationSchema = new Schema({
  migrationId:   { type: String, required: true, unique: true },
  appliedAt:     { type: Date, default: Date.now },
  conversionRate: { type: Number, required: true },
  rollbackAt:    { type: Date },
  status:        { type: String, enum: ["applied", "rolled_back"], default: "applied" },
});

const MigrationModel =
  (mongoose.models.Migration as mongoose.Model<typeof MigrationSchema>) ||
  mongoose.model("Migration", MigrationSchema);

// ── Auth helper ───────────────────────────────────────────────────────────────

function authorize(req: NextRequest): boolean {
  const secret = process.env.MIGRATION_SECRET;
  if (!secret) return true; // allow in dev if not set
  return req.headers.get("x-migration-secret") === secret;
}

// ── Rounding helper ───────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── GET — status ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const record = await MigrationModel.findOne({ migrationId: MIGRATION_ID }).lean();

    return NextResponse.json({
      success: true,
      data: {
        migrationId:  MIGRATION_ID,
        defaultRate:  DEFAULT_RATE,
        record:       record ?? null,
        applied:      (record as { status?: string } | null)?.status === "applied",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

// ── POST — apply ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const rate = Number(searchParams.get("rate") ?? DEFAULT_RATE);
    if (!rate || rate <= 0) {
      return NextResponse.json({ success: false, error: "Invalid conversion rate" }, { status: 400 });
    }

    // Idempotency guard
    const existing = await MigrationModel.findOne({ migrationId: MIGRATION_ID }).lean() as { status?: string } | null;
    if (existing?.status === "applied") {
      return NextResponse.json(
        { success: false, error: `Migration '${MIGRATION_ID}' already applied. Run DELETE to rollback first.` },
        { status: 409 }
      );
    }

    const ProductModel = (await import("@/lib/db/models/product.model")).default;
    const OfferModel   = (await import("@/lib/db/models/offer.model")).default;
    const OrderModel   = (await import("@/lib/db/models/order.model")).default;

    const results: Record<string, number> = {};

    // ── Products ──────────────────────────────────────────────────────────────
    const products = await ProductModel.find({}).lean() as Array<{
      _id: mongoose.Types.ObjectId; price: number; originalPrice?: number;
    }>;

    let productCount = 0;
    for (const p of products) {
      const update: Record<string, number> = { price: round2(p.price * rate) };
      if (p.originalPrice) update.originalPrice = round2(p.originalPrice * rate);
      await ProductModel.findByIdAndUpdate(p._id, { $set: update });
      productCount++;
    }
    results.products = productCount;

    // ── Offers (fixed discountValue + minOrderValue) ───────────────────────────
    const offers = await OfferModel.find({}).lean() as Array<{
      _id: mongoose.Types.ObjectId;
      discountType: string;
      discountValue: number;
      minOrderValue: number;
    }>;

    let offerCount = 0;
    for (const o of offers) {
      const update: Record<string, number> = {
        minOrderValue: round2(o.minOrderValue * rate),
      };
      if (o.discountType === "fixed") {
        update.discountValue = round2(o.discountValue * rate);
      }
      await OfferModel.findByIdAndUpdate(o._id, { $set: update });
      offerCount++;
    }
    results.offers = offerCount;

    // ── Orders (historical — convert all monetary fields) ─────────────────────
    const orders = await OrderModel.find({}).lean() as Array<{
      _id: mongoose.Types.ObjectId;
      subtotal: number;
      deliveryFee: number;
      codCharge: number;
      discount: number;
      total: number;
      items: Array<{ price: number }>;
    }>;

    let orderCount = 0;
    for (const ord of orders) {
      const updatedItems = ord.items.map((it) => ({
        ...it,
        price: round2(it.price * rate),
      }));
      await OrderModel.findByIdAndUpdate(ord._id, {
        $set: {
          subtotal:    round2(ord.subtotal    * rate),
          deliveryFee: round2(ord.deliveryFee * rate),
          codCharge:   round2((ord.codCharge  ?? 0) * rate),
          discount:    round2(ord.discount    * rate),
          total:       round2(ord.total       * rate),
          items:       updatedItems,
        },
      });
      orderCount++;
    }
    results.orders = orderCount;

    // ── Record migration ──────────────────────────────────────────────────────
    await MigrationModel.findOneAndUpdate(
      { migrationId: MIGRATION_ID },
      { migrationId: MIGRATION_ID, conversionRate: rate, appliedAt: new Date(), status: "applied", $unset: { rollbackAt: 1 } },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        message: `Migration '${MIGRATION_ID}' applied at rate ×${rate}`,
        conversionRate: rate,
        updated: results,
      },
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Migration failed" },
      { status: 500 }
    );
  }
}

// ── DELETE — rollback ─────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const record = await MigrationModel.findOne({ migrationId: MIGRATION_ID }).lean() as {
      status?: string; conversionRate?: number;
    } | null;

    if (!record || record.status !== "applied") {
      return NextResponse.json(
        { success: false, error: `Migration '${MIGRATION_ID}' has not been applied.` },
        { status: 409 }
      );
    }

    const rate = record.conversionRate ?? DEFAULT_RATE;

    const ProductModel = (await import("@/lib/db/models/product.model")).default;
    const OfferModel   = (await import("@/lib/db/models/offer.model")).default;
    const OrderModel   = (await import("@/lib/db/models/order.model")).default;

    const results: Record<string, number> = {};

    // ── Products rollback ─────────────────────────────────────────────────────
    const products = await ProductModel.find({}).lean() as Array<{
      _id: mongoose.Types.ObjectId; price: number; originalPrice?: number;
    }>;
    for (const p of products) {
      const update: Record<string, number> = { price: round2(p.price / rate) };
      if (p.originalPrice) update.originalPrice = round2(p.originalPrice / rate);
      await ProductModel.findByIdAndUpdate(p._id, { $set: update });
    }
    results.products = products.length;

    // ── Offers rollback ───────────────────────────────────────────────────────
    const offers = await OfferModel.find({}).lean() as Array<{
      _id: mongoose.Types.ObjectId;
      discountType: string;
      discountValue: number;
      minOrderValue: number;
    }>;
    for (const o of offers) {
      const update: Record<string, number> = {
        minOrderValue: round2(o.minOrderValue / rate),
      };
      if (o.discountType === "fixed") {
        update.discountValue = round2(o.discountValue / rate);
      }
      await OfferModel.findByIdAndUpdate(o._id, { $set: update });
    }
    results.offers = offers.length;

    // ── Orders rollback ───────────────────────────────────────────────────────
    const orders = await OrderModel.find({}).lean() as Array<{
      _id: mongoose.Types.ObjectId;
      subtotal: number; deliveryFee: number; codCharge: number;
      discount: number; total: number;
      items: Array<{ price: number }>;
    }>;
    for (const ord of orders) {
      const updatedItems = ord.items.map((it) => ({ ...it, price: round2(it.price / rate) }));
      await OrderModel.findByIdAndUpdate(ord._id, {
        $set: {
          subtotal:    round2(ord.subtotal    / rate),
          deliveryFee: round2(ord.deliveryFee / rate),
          codCharge:   round2((ord.codCharge  ?? 0) / rate),
          discount:    round2(ord.discount    / rate),
          total:       round2(ord.total       / rate),
          items:       updatedItems,
        },
      });
    }
    results.orders = orders.length;

    // ── Mark rolled back ──────────────────────────────────────────────────────
    await MigrationModel.findOneAndUpdate(
      { migrationId: MIGRATION_ID },
      { status: "rolled_back", rollbackAt: new Date() }
    );

    return NextResponse.json({
      success: true,
      data: {
        message: `Migration '${MIGRATION_ID}' rolled back (÷${rate})`,
        reverted: results,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Rollback failed" },
      { status: 500 }
    );
  }
}
