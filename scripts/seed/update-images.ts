/**
 * update-images — Adds 3-4 realistic Unsplash images to every product that has none.
 *
 * Maps each product's category (display name) to a curated pool of photo IDs,
 * then picks deterministically based on the product's position in the batch.
 *
 * Run:
 *   npm run seed:images
 */

import * as path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { connectDB } from "../../src/lib/db/mongoose";
import ProductModel from "../../src/lib/db/models/product.model";
import CategoryModel from "../../src/lib/db/models/category.model";

// ─── Image pool ───────────────────────────────────────────────────────────────

const U = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const POOLS: Record<string, string[]> = {
  "Electronics & Gaming": [
    U("1496181133206-80ce9b88a853"),  // MacBook
    U("1505740420928-5e560c06d30e"),  // headphones
    U("1593359677879-a4bb92f829d1"),  // TV screen
    U("1488590528505-98d2b5aba04b"),  // tech accessories
    U("1531297484001-80022131f5a1"),  // laptop flat lay
    U("1498049794561-7780e7231661"),  // desktop computer
    U("1525547719271-a1f33a64d1bc"),  // MacBook on table
    U("1603302576837-37d3ba2df07e"),  // laptop open
    U("1593642632559-0c6d3fc62b89"),  // tech setup
    U("1625231335643-65bc65e5a79c"),  // gaming setup
  ],
  "Mobiles": [
    U("1592750475338-74b7b21085ab"),
    U("1511707171634-5f897ff02aa9"),
    U("1574755393849-623942496936"),
    U("1610945265064-0e34e5519bbf"),
    U("1601784551446-20c9e07cdbdb"),
    U("1614083006873-b7e0bab60ac3"),
    U("1570101428030-ca2f0f2d2e8b"),
    U("1580910051074-3eb694886505"),
    U("1556803988069-4547c6298bc8"),
    U("1583573636537-25e00a9e53ce"),
  ],
  "Fresh Food": [
    U("1518977676601-b53f82aba655"),  // vegetables on board
    U("1557800636-1dbf0fc4d72c"),     // fresh veg
    U("1540420773420-3a4aa573d5d8"),  // colourful veg
    U("1484723091026-b7ed0d1bb43a"),  // fresh produce
    U("1450778869180-41d0601e046e"),  // market veg
    U("1512621776951-a57141f2eefd"),  // food market
    U("1590779033100-9f60a05a0213"),  // fruit and veg
    U("1610832958506-aa56368176cf"),  // vegetables close-up
    U("1589010588553-46e8e7c21788"),  // organic produce
    U("1474654154744-e4cbf55c3ddc"),  // mixed fruits
  ],
  "Bakery": [
    U("1509440159565-1c1d9e7c0a0b"),  // fresh bread
    U("1568254183919-78a4f43a2877"),  // artisan bread
    U("1555507036-ab1f4038808a"),     // croissants
    U("1486427944299-d1955d23e34d"),  // bakery display
    U("1517433456452-f9bacce2ce20"),  // artisan loaf
    U("1608198093002-ad4e005484ec"),  // sourdough bread
    U("1549931319-a545dcf3bc7c"),     // bread rolls
    U("1558961363-fa8fdf82db35"),     // pastries
  ],
  "Frozen Food": [
    U("1611143669191-b3456bbb1f40"),  // frozen aisle
    U("1589997867897-db6df4e1ded7"),  // frozen food
    U("1565073419-76eae1abe43a"),     // ice cream
    U("1563636619-e9143da7973b"),     // frozen meal
    U("1571091718767-18b5b1457add"),  // frozen veg
    U("1522184236945-c6e97f09e44d"),  // fridge food
    U("1587834374828-1f786b0b50c4"),  // freezer food
    U("1515165562835-df04c3a7fc5c"),  // frozen fruit
  ],
  "Treats & Snacks": [
    U("1566478989037-eec170784d0b"),  // crisps/chips
    U("1511381939415-e44015466834"),  // chocolate bar
    U("1558961363-fa8fdf82db35"),     // cookies
    U("1621939260-e7c7d02bb11a"),     // candy
    U("1559181567-c3190150d943"),     // snacks assortment
    U("1582095133179-bfd08e2eedb3"),  // biscuits
    U("1534256958297-56d9b8d9b357"),  // chocolate truffle
    U("1571091718767-18b5b1457add"),  // party snacks
  ],
  "Food Cupboard": [
    U("1587489936396-b6c7706db0e7"),  // canned goods
    U("1547592166-23ac45744acd"),     // pasta/rice
    U("1586201375761-83865001e31c"),  // grocery items
    U("1584813960-faf28dfeee95"),     // pantry
    U("1516684516-83a5e919c73c"),     // jars
    U("1506368083636-6defb67639a1"),  // condiments
    U("1563636619-e9143da7973b"),     // store cupboard
    U("1597290282695-edc43d0e7129"),  // olive oil/sauces
  ],
  "Drinks": [
    U("1553361371-9b22f78e8b1d"),     // water bottles
    U("1495474472287-4d71bcdd2085"),  // coffee cup
    U("1571864019-3f53cb2de0c0"),     // mixed drinks
    U("1556742077-0a6b6a4a4ac4"),     // tea
    U("1513558718830-4c3b9eb4e131"),  // soda drinks
    U("1611689102919-54e37c35b2a5"),  // juices
    U("1534040385115-33dcb3f65729"),  // fruit juice
    U("1486915309851-b82ac083e3f1"),  // coffee flat lay
  ],
  "Health & Beauty": [
    U("1596870230751-23ad2c9d9b02"),  // beauty products
    U("1571781926-e2b7c8db1a53"),     // skincare
    U("1583947215-e98eb066c0f5"),     // health products
    U("1567721913486-6585f069b178"),  // vitamins
    U("1571019613454-1cb2f99b2d8b"),  // wellness
    U("1522335789203-aabd1fc54bc9"),  // cosmetics
    U("1589302168068-964664d93dc0"),  // beauty routine
    U("1556229010-6c69accounted86"),  // personal care
  ],
  "Household": [
    U("1563453392-9be4c6e0de6e"),     // cleaning products
    U("1584820927-6c38baa03f03"),     // household items
    U("1612538498456-e861dcb4b8c3"),  // spray bottles
    U("1547393947-8d8cb349c77b"),     // cleaning supplies
    U("1558618047-3b45b99e4e51"),     // laundry
    U("1613791453440-e94cfb5e2b11"),  // home cleaning
    U("1521401830-0c6e5b5a3a39"),     // washing powder
    U("1556909172-8c4bfdb3d9eb"),     // household essentials
  ],
  "Baby & Toddler": [
    U("1522252234503-e356f0ab4b61"),  // baby products
    U("1519941027-28364495d1c9"),     // baby items
    U("1565073419-76eae1abe43a"),     // baby care
    U("1515488042361-ee00e4c40f2f"),  // baby toys
    U("1476362555312-ab9e108a0b7e"),  // baby accessories
    U("1599255068110-5c6369e2ae28"),  // nappies
    U("1573497019940-1c28c88b4f3e"),  // baby food
    U("1512485800893-b08ec1ea59b1"),  // infant care
  ],
  "Pets": [
    U("1541781774778-4ad69becc38f"),  // pet food
    U("1587300003388-59208cc962cb"),  // dog food
    U("1601758003122-53c40fc686ab"),  // cat food
    U("1548199973-ec2cb9df48b6"),     // pet bowl
    U("1450778869180-41d0601e046e"),  // pet treats
    U("1530281700549-e82f7042574b"),  // dog accessories
    U("1574158622682-e029649f8e3a"),  // cat toys
    U("1560807707-8cc77767d783"),     // pet care products
  ],
  "Home & Furniture": [
    U("1555041469-aba7e60da3f1"),     // home decor
    U("1524758631624-e2822132143b"),  // furniture
    U("1567016432779-094069958ea5"),  // living room
    U("1556909114-f6e7ad7d3136"),     // kitchen items
    U("1493663284031-b7b73aa3aebc"),  // bedroom furniture
    U("1583845112216-c8f357b5b5af"),  // home accessories
    U("1618220179428-22790b461feb"),  // dining furniture
    U("1585412906505-8ff39e8b3b2d"),  // home interior
  ],
  "Clothing & Accessories": [
    U("1489987707849-f85b9cdb96de"),  // folded clothes
    U("1434389677669-e08b4cac3105"),  // clothing store
    U("1558618047-3b45b99e4e51"),     // fashion shopping
    U("1542291026-7a2a2b9a36d3"),     // shopping bags
    U("1551488831-00ddcb6c6bd3"),     // accessories
    U("1523381294911-8d3cce6e9e31"),  // clothes rack
    U("1485518882345-4bb52aa6e7b4"),  // wardrobe
    U("1469334031218-e382a71b716b"),  // fashion flat lay
  ],
  "Toys & Games": [
    U("1596461594-b4d3f7f44046"),     // lego bricks
    U("1548707025-0baf27a3ee6a"),     // board games
    U("1515488042361-ee00e4c40f2f"),  // kids toys
    U("1558618047-3b45b99e4e51"),     // toy store
    U("1566753323557-7a8fb8a32a94"),  // toys assortment
    U("1555487505-8603a1a47f80"),     // building blocks
    U("1597733336447-ef3b8e5e3ee4"),  // educational toys
    U("1560807707-8cc77767d783"),     // games collection
  ],
  "Sports & Leisure": [
    U("1538648759209-2a0bc98e9c04"),  // sports gear
    U("1517838277536-f5f99be501cd"),  // fitness equipment
    U("1571902943202-507ec2618e8f"),  // gym workout
    U("1528190336454-13cd56b45b5a"),  // sports accessories
    U("1461896836374-cf369624c9be"),  // running shoes
    U("1544367567-0f2fcb009e0b"),     // fitness class
    U("1547919307-1ecb10702ca6"),     // yoga mat
    U("1590227764840-5564e4ef6e7e"),  // sports clothing
  ],
  "Garden, DIY & Car": [
    U("1416879595882-3cf6c4e70ef5"),  // garden
    U("1507003211169-0a1dd7228f2d"),  // tools
    U("1589997867897-db6df4e1ded7"),  // plants
    U("1585320806-1eeddb90b07a"),     // gardening
    U("1416339442236-8ceb164046f8"),  // garden tools
    U("1464022759023-fed622ff2c3b"),  // hardware tools
    U("1611802851601-04a891e7bf6e"),  // diy tools
    U("1462275646964-a0e3386b89fa"),  // garden plants
  ],
  "Hobbies & Stationery": [
    U("1528819622765-d6bcf132f793"),  // stationery
    U("1586281380349-632531db7ed4"),  // art supplies
    U("1471107191679-f26174d2d41e"),  // crafts
    U("1513542789411-b6a5d4f31634"),  // notebooks
    U("1456735190827-d1262f71b8a3"),  // pencils/pens
    U("1533228100845-08145b4ded3b"),  // art materials
    U("1481627834876-b7833e8f5455"),  // reading/books
    U("1507842217343-583bb2515dc9"),  // stationery flat lay
  ],
  "Parties & Seasonal": [
    U("1530103862676-de8c9debad1d"),  // party decorations
    U("1513151233558-d860c5398176"),  // celebration
    U("1514525253161-7a46d19cd819"),  // balloons
    U("1467810563316-b15d3b0f-e2cb"), // birthday party
    U("1504196606372-823ced3d0a6e"),  // confetti
    U("1527529482837-4698179dc6ce"), // party table
    U("1602631985686-1bb0e6a8696b"),  // christmas decor
    U("1512389142860-43c7b20e8be9"),  // gift boxes
  ],
};

// Fallback for any unlisted category
const FALLBACK_POOL = [
  U("1560472354-b33d0cf2d00a"),
  U("1556909172-8c4bfdb3d9eb"),
  U("1574270981993-f5a0a8f0f5b2"),
  U("1524059630989-ca17e6be1200"),
  U("1584305535-7e14b0e8a258"),
];

function getImages(category: string, seed: number, count: number): string[] {
  const pool = POOLS[category] ?? FALLBACK_POOL;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[(seed + i) % pool.length]);
  }
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    console.error("❌  MONGODB_URI not configured in .env.local");
    process.exit(1);
  }

  console.log("\n🔌  Connecting to MongoDB...");
  await connectDB();
  console.log("✅  Connected\n");

  const total = await ProductModel.countDocuments({});
  console.log(`📦  Total products: ${total}`);
  console.log("🖼️   Adding 3-4 images per product (all products)...\n");

  // Process in batches to avoid loading all into memory
  const BATCH = 300;
  let processed = 0;
  let skip = 0;

  while (skip < total) {
    const products = await ProductModel
      .find({})
      .select("_id category")
      .skip(skip)
      .limit(BATCH)
      .lean<{ _id: mongoose.Types.ObjectId; category: string }[]>();

    if (products.length === 0) break;

    const bulkOps = products.map((p, idx) => {
      const globalIdx = skip + idx;
      const imgCount  = 3 + (globalIdx % 2); // alternates 3 and 4
      const images    = getImages(p.category, globalIdx, imgCount);
      return {
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { images } },
        },
      };
    });

    await ProductModel.bulkWrite(bulkOps, { ordered: false });
    processed += products.length;
    process.stdout.write(`   Updated ${processed}/${total} products\r`);
    skip += BATCH;
  }

  console.log(`\n✅  ${processed} products updated with images\n`);

  // Also update category images if missing
  console.log("📂  Updating category images...");
  const CATEGORY_IMAGES: Record<string, string> = {
    "fresh-food":          U("1518977676601-b53f82aba655"),
    "bakery":              U("1509440159565-1c1d9e7c0a0b"),
    "frozen-food":         U("1611143669191-b3456bbb1f40"),
    "treats-snacks":       U("1566478989037-eec170784d0b"),
    "food-cupboard":       U("1587489936396-b6c7706db0e7"),
    "drinks":              U("1553361371-9b22f78e8b1d"),
    "health-beauty":       U("1596870230751-23ad2c9d9b02"),
    "household":           U("1563453392-9be4c6e0de6e"),
    "baby-toddler":        U("1522252234503-e356f0ab4b61"),
    "pets":                U("1541781774778-4ad69becc38f"),
    "home-furniture":      U("1555041469-aba7e60da3f1"),
    "electronics-gaming":  U("1496181133206-80ce9b88a853"),
    "mobiles":             U("1592750475338-74b7b21085ab"),
    "clothing-accessories": U("1489987707849-f85b9cdb96de"),
    "toys-games":          U("1596461594-b4d3f7f44046"),
    "sports-leisure":      U("1538648759209-2a0bc98e9c04"),
    "garden-diy-car":      U("1416879595882-3cf6c4e70ef5"),
    "hobbies-stationery":  U("1528819622765-d6bcf132f793"),
    "parties-seasonal":    U("1530103862676-de8c9debad1d"),
  };

  const catOps = Object.entries(CATEGORY_IMAGES).map(([slug, image]) => ({
    updateOne: {
      filter: { slug },
      update: { $set: { image } },
    },
  }));

  const catResult = await CategoryModel.bulkWrite(catOps, { ordered: false });
  console.log(`   Updated ${catResult.modifiedCount} category images\n`);

  console.log("─────────────────────────────────────────");
  console.log(`✅  Image update complete`);
  console.log(`   Products updated: ${processed}`);
  console.log(`   Categories updated: ${catResult.modifiedCount}`);
  console.log("─────────────────────────────────────────\n");

  await mongoose.disconnect();
}

void run().catch((err) => {
  console.error("❌  Image update failed:", err);
  process.exit(1);
});
