/**
 * Marketplace Cleanup Script
 *
 * Clears all business/marketplace data while preserving:
 *   - users (all roles: admin, vendor, customer)
 *   - vendors
 *   - vendor invites (auth lifecycle)
 *
 * Run:
 *   npm run cleanup:marketplace
 */

import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";

// ─── Models ───────────────────────────────────────────────────────────────────

import CartModel from "../src/lib/db/models/cart.model";
import CategoryModel from "../src/lib/db/models/category.model";
import CategoryAttributesModel from "../src/lib/db/models/category-attributes.model";
import CommissionConfigModel from "../src/lib/db/models/commission-config.model";
import DeliverySlotModel from "../src/lib/db/models/delivery-slot.model";
import FaqModel from "../src/lib/db/models/faq.model";
import HomepageSectionModel from "../src/lib/db/models/homepage-section.model";
import OfferModel from "../src/lib/db/models/offer.model";
import OrderModel from "../src/lib/db/models/order.model";
import PaymentMethodModel from "../src/lib/db/models/payment-method.model";
import ProductModel from "../src/lib/db/models/product.model";
import PromoUsageModel from "../src/lib/db/models/promo-usage.model";
import ReviewModel from "../src/lib/db/models/review.model";
import StoreModel from "../src/lib/db/models/store.model";
import VendorEarningModel from "../src/lib/db/models/vendor-earning.model";
import VendorOrderModel from "../src/lib/db/models/vendor-order.model";
import WishlistModel from "../src/lib/db/models/wishlist.model";
import AddressModel from "../src/lib/db/models/address.model";

// ─── Collections to clear ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TARGETS: Array<{ name: string; model: mongoose.Model<any> }> = [
  // Orders & financials first (have refs to everything else)
  { name: "VendorEarning", model: VendorEarningModel },
  { name: "VendorOrder", model: VendorOrderModel },
  { name: "Order", model: OrderModel },
  { name: "PromoUsage", model: PromoUsageModel },

  // User activity
  { name: "Review", model: ReviewModel },
  { name: "Cart", model: CartModel },
  { name: "Wishlist", model: WishlistModel },
  { name: "Address", model: AddressModel },
  { name: "PaymentMethod", model: PaymentMethodModel },

  // Catalog
  { name: "CommissionConfig", model: CommissionConfigModel },
  { name: "Product", model: ProductModel },
  { name: "CategoryAttributes", model: CategoryAttributesModel },
  { name: "Category", model: CategoryModel },

  // Platform content
  { name: "Offer", model: OfferModel },
  { name: "HomepageSection", model: HomepageSectionModel },
  { name: "DeliverySlot", model: DeliverySlotModel },
  { name: "Store", model: StoreModel },
  { name: "Faq", model: FaqModel },
];

// ─── Preserved collections (logged for visibility) ───────────────────────────

const PRESERVED = ["User", "Vendor", "VendorInvite"];

// ─── Main ────────────────────────────────────────────────────────────────────

async function cleanup() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    console.error("❌  MONGODB_URI is not configured in .env.local");
    process.exit(1);
  }

  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(uri, { bufferCommands: false });
  console.log("✅  Connected\n");

  console.log("🔒  Preserved collections:", PRESERVED.join(", "), "\n");
  console.log("🗑️   Clearing marketplace data...\n");

  let totalDeleted = 0;

  for (const { name, model } of TARGETS) {
    const result = await model.deleteMany({});
    const count = result.deletedCount ?? 0;
    totalDeleted += count;
    console.log(`   ${name.padEnd(20)} — ${count} documents removed`);
  }

  console.log(
    `\n✅  Cleanup complete. Total removed: ${totalDeleted} documents`,
  );
  await mongoose.disconnect();
}

cleanup().catch((err) => {
  console.error("❌  Cleanup failed:", err);
  process.exit(1);
});
