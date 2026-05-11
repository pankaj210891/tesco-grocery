/**
 * Seed script — creates 1 admin + 10 vendor accounts
 * Run: node scripts/seed-accounts.mjs
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI =
  "mongodb+srv://tesco_app_user:Tesco%402024%23Grocery@cluster0.gis5coo.mongodb.net/tesco-grocery?retryWrites=true&w=majority&appName=Cluster0";

// ─── Schemas ────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ["customer", "vendor", "admin"], default: "customer" },
    status:   { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true }
);

const VendorSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    logo:        { type: String, default: "" },
    email:       { type: String, required: true, lowercase: true, trim: true },
    phone:       { type: String, default: "" },
    address:     { type: String, default: "" },
    city:        { type: String, default: "" },
    status:      { type: String, enum: ["pending", "active", "suspended"], default: "active" },
    ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerName:   { type: String, required: true },
  },
  { timestamps: true }
);

const UserModel   = mongoose.models.User   || mongoose.model("User",   UserSchema);
const VendorModel = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);

// ─── Seed Data ───────────────────────────────────────────────────────────────

const ADMIN = {
  name:     "Prakash Admin",
  email:    "admin@prakash.com",
  password: "Admin@1234",
  role:     "admin",
  status:   "active",
};

const VENDORS = [
  {
    user: { name: "Raj Fresh Farms",       email: "raj.fresh@prakash.com",     password: "Vendor@1234" },
    shop: { name: "Raj Fresh Farms",       slug: "raj-fresh-farms",       description: "Premium fresh fruits and vegetables sourced daily from local farms.",  category: "Fresh Produce",         phone: "07700 900001", city: "London"     },
  },
  {
    user: { name: "Golden Crust Bakery",   email: "golden.crust@prakash.com",  password: "Vendor@1234" },
    shop: { name: "Golden Crust Bakery",   slug: "golden-crust-bakery",   description: "Artisan breads, pastries, and cakes baked fresh every morning.",       category: "Bakery & Bread",        phone: "07700 900002", city: "Manchester" },
  },
  {
    user: { name: "Dairy Belle Co.",       email: "dairy.belle@prakash.com",   password: "Vendor@1234" },
    shop: { name: "Dairy Belle Co.",       slug: "dairy-belle-co",        description: "Farm-fresh dairy products including milk, cheese, butter, and eggs.",  category: "Dairy & Eggs",          phone: "07700 900003", city: "Birmingham" },
  },
  {
    user: { name: "Ocean & Pasture",       email: "ocean.pasture@prakash.com", password: "Vendor@1234" },
    shop: { name: "Ocean & Pasture",       slug: "ocean-and-pasture",     description: "Quality meat, poultry, and sustainably caught seafood.",               category: "Meat & Seafood",        phone: "07700 900004", city: "Bristol"    },
  },
  {
    user: { name: "Sip & Refresh",         email: "sip.refresh@prakash.com",   password: "Vendor@1234" },
    shop: { name: "Sip & Refresh",         slug: "sip-and-refresh",       description: "Soft drinks, juices, coffees, teas, and healthy beverage alternatives.", category: "Beverages",            phone: "07700 900005", city: "Leeds"      },
  },
  {
    user: { name: "Crunch & Munch Snacks", email: "crunch.munch@prakash.com",  password: "Vendor@1234" },
    shop: { name: "Crunch & Munch Snacks", slug: "crunch-and-munch",      description: "Crisps, chocolates, sweets, and confectionery for every occasion.",    category: "Snacks & Confectionery", phone: "07700 900006", city: "Sheffield" },
  },
  {
    user: { name: "Polar Ice Foods",       email: "polar.ice@prakash.com",     password: "Vendor@1234" },
    shop: { name: "Polar Ice Foods",       slug: "polar-ice-foods",       description: "Frozen meals, ice cream, vegetables, and convenient frozen options.",  category: "Frozen Foods",          phone: "07700 900007", city: "Edinburgh"  },
  },
  {
    user: { name: "Pure Earth Organics",   email: "pure.earth@prakash.com",    password: "Vendor@1234" },
    shop: { name: "Pure Earth Organics",   slug: "pure-earth-organics",   description: "Certified organic and natural health foods, supplements, and snacks.", category: "Health & Organic",      phone: "07700 900008", city: "Oxford"     },
  },
  {
    user: { name: "World Kitchen Hub",     email: "world.kitchen@prakash.com", password: "Vendor@1234" },
    shop: { name: "World Kitchen Hub",     slug: "world-kitchen-hub",     description: "Authentic ingredients and products from cuisines around the globe.",   category: "International Foods",   phone: "07700 900009", city: "Nottingham" },
  },
  {
    user: { name: "CleanHome Essentials",  email: "cleanhome@prakash.com",     password: "Vendor@1234" },
    shop: { name: "CleanHome Essentials",  slug: "cleanhome-essentials",  description: "Household cleaning products, detergents, and home care essentials.",  category: "Household & Cleaning",  phone: "07700 900010", city: "Liverpool"  },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.\n");

  // ── 1. Admin ──────────────────────────────────────────────────────────────
  const existingAdmin = await UserModel.findOne({ email: ADMIN.email });
  if (existingAdmin) {
    console.log(`⚠  Admin already exists: ${ADMIN.email}`);
  } else {
    const hashed = await bcrypt.hash(ADMIN.password, 12);
    await UserModel.create({ ...ADMIN, password: hashed });
    console.log(`✓  Admin created:  ${ADMIN.email}  (password: ${ADMIN.password})`);
  }

  console.log("");

  // ── 2. Vendors ────────────────────────────────────────────────────────────
  for (const v of VENDORS) {
    let userDoc = await UserModel.findOne({ email: v.user.email });

    if (userDoc) {
      console.log(`⚠  User already exists: ${v.user.email}`);
    } else {
      const hashed = await bcrypt.hash(v.user.password, 12);
      userDoc = await UserModel.create({
        name:     v.user.name,
        email:    v.user.email,
        password: hashed,
        role:     "vendor",
        status:   "active",
      });
      console.log(`✓  Vendor user created: ${v.user.email}  (password: ${v.user.password})`);
    }

    const existingShop = await VendorModel.findOne({ slug: v.shop.slug });
    if (existingShop) {
      console.log(`   ⚠  Vendor shop already exists: ${v.shop.slug}`);
    } else {
      await VendorModel.create({
        name:        v.shop.name,
        slug:        v.shop.slug,
        description: v.shop.description,
        email:       v.user.email,
        phone:       v.shop.phone,
        address:     "1 High Street",
        city:        v.shop.city,
        status:      "active",
        ownerId:     userDoc._id,
        ownerName:   v.user.name,
      });
      console.log(`   ✓  Vendor shop created:  ${v.shop.name}  [${v.shop.category}]`);
    }
  }

  console.log("\n── Summary ─────────────────────────────────────────────────");
  console.log("Admin account:");
  console.log(`  Email:    ${ADMIN.email}`);
  console.log(`  Password: ${ADMIN.password}`);
  console.log("\nVendor accounts (all use password: Vendor@1234):");
  VENDORS.forEach((v, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${v.user.email.padEnd(35)} — ${v.shop.category}`);
  });
  console.log("────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => { console.error(err); process.exit(1); });
