/**
 * scripts/generate-images.mjs
 * Generates all product and category WebP images using sharp + inline SVG.
 * Uses geometric shapes + text (no emoji) for reliable cross-platform rendering.
 *
 * Run: node scripts/generate-images.mjs
 *      npm run generate-images
 *
 * Output:
 *   public/images/products/{slug}/main.webp      (800×800)
 *   public/images/products/{slug}/side.webp      (600×600)
 *   public/images/products/{slug}/lifestyle.webp (1200×600)
 *   public/images/products/{slug}/closeup.webp   (500×500)
 *   public/images/categories/{slug}.webp         (600×400)
 *   public/images/placeholder-product.webp       (800×800)
 */

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT          = path.join(__dirname, "..");
const PRODUCTS_DIR  = path.join(ROOT, "public", "images", "products");
const CATEGORIES_DIR = path.join(ROOT, "public", "images", "categories");

// ── Category visual metadata ───────────────────────────────────────────────

const CATS = {
  "fresh-food":           { name: "Fresh Food",           abbr: "FF", g1: "#f0fdf4", g2: "#bbf7d0", accent: "#16a34a", fg: "#14532d" },
  "bakery":               { name: "Bakery",               abbr: "BK", g1: "#fefce8", g2: "#fef9c3", accent: "#ca8a04", fg: "#713f12" },
  "frozen-food":          { name: "Frozen Food",          abbr: "FZ", g1: "#ecfeff", g2: "#cffafe", accent: "#0891b2", fg: "#164e63" },
  "treats-snacks":        { name: "Treats & Snacks",      abbr: "TS", g1: "#fff7ed", g2: "#ffedd5", accent: "#ea580c", fg: "#7c2d12" },
  "food-cupboard":        { name: "Food Cupboard",        abbr: "FC", g1: "#fefce8", g2: "#fef08a", accent: "#ca8a04", fg: "#713f12" },
  "drinks":               { name: "Drinks",               abbr: "DR", g1: "#faf5ff", g2: "#f3e8ff", accent: "#9333ea", fg: "#581c87" },
  "health-beauty":        { name: "Health & Beauty",      abbr: "HB", g1: "#fdf4ff", g2: "#fae8ff", accent: "#c026d3", fg: "#701a75" },
  "household":            { name: "Household",            abbr: "HH", g1: "#f9fafb", g2: "#f3f4f6", accent: "#4b5563", fg: "#111827" },
  "baby-toddler":         { name: "Baby & Toddler",       abbr: "BT", g1: "#fdf2f8", g2: "#fce7f3", accent: "#db2777", fg: "#831843" },
  "pets":                 { name: "Pets",                 abbr: "PT", g1: "#f7fee7", g2: "#ecfccb", accent: "#65a30d", fg: "#365314" },
  "home-furniture":       { name: "Home & Furniture",     abbr: "HF", g1: "#fafaf9", g2: "#f5f5f4", accent: "#57534e", fg: "#1c1917" },
  "electronics-gaming":   { name: "Electronics & Gaming", abbr: "EG", g1: "#eff6ff", g2: "#dbeafe", accent: "#2563eb", fg: "#1e3a8a" },
  "clothing-accessories": { name: "Clothing",             abbr: "CA", g1: "#fff1f2", g2: "#ffe4e6", accent: "#e11d48", fg: "#881337" },
  "toys-games":           { name: "Toys & Games",         abbr: "TG", g1: "#fef2f2", g2: "#fee2e2", accent: "#dc2626", fg: "#7f1d1d" },
  "sports-leisure":       { name: "Sports & Leisure",     abbr: "SL", g1: "#eef2ff", g2: "#e0e7ff", accent: "#4f46e5", fg: "#312e81" },
  "garden-diy-car":       { name: "Garden & DIY",         abbr: "GD", g1: "#f0fdf4", g2: "#dcfce7", accent: "#15803d", fg: "#14532d" },
  "hobbies-stationery":   { name: "Hobbies",              abbr: "HS", g1: "#ecfdf5", g2: "#d1fae5", accent: "#059669", fg: "#064e3b" },
  "parties-seasonal":     { name: "Parties & Seasonal",   abbr: "PS", g1: "#f0fdfa", g2: "#ccfbf1", accent: "#0d9488", fg: "#134e4a" },
  "marketplace":          { name: "Marketplace",          abbr: "MK", g1: "#f5f3ff", g2: "#ede9fe", accent: "#6d28d9", fg: "#4c1d95" },
  "kiosk":                { name: "Kiosk",                abbr: "KS", g1: "#f0f9ff", g2: "#e0f2fe", accent: "#0284c7", fg: "#0c4a6e" },
  "inspiration-events":   { name: "Events",               abbr: "IE", g1: "#fffbeb", g2: "#fef3c7", accent: "#d97706", fg: "#78350f" },
};

// ── Full product list (204 items) ────────────────────────────────────────────

const PRODUCTS = [
  { n: "Organic Whole Milk 2L",                         c: "fresh-food" },
  { n: "Free Range Large Eggs 6pk",                     c: "fresh-food" },
  { n: "Baby Spinach Leaves 200g",                      c: "fresh-food" },
  { n: "Cherry Tomatoes 250g",                          c: "fresh-food" },
  { n: "British Chicken Breast Fillets",                c: "fresh-food" },
  { n: "Scottish Salmon Fillet 240g",                   c: "fresh-food" },
  { n: "Greek Style Yogurt 500g",                       c: "fresh-food" },
  { n: "Unsalted Butter 250g",                          c: "fresh-food" },
  { n: "Mature Cheddar Cheese 400g",                    c: "fresh-food" },
  { n: "Ripe Avocados 2pk",                             c: "fresh-food" },
  { n: "Braeburn Apples 6pk",                           c: "fresh-food" },
  { n: "Chantenay Carrots 500g",                        c: "fresh-food" },
  { n: "Chestnut Mushrooms 250g",                       c: "fresh-food" },
  { n: "Tenderstem Broccoli 200g",                      c: "fresh-food" },
  { n: "British Strawberries 400g",                     c: "fresh-food" },
  { n: "Full Fat Cream Cheese 200g",                    c: "fresh-food" },
  { n: "Soured Cream 300ml",                            c: "fresh-food" },
  { n: "British Beef Mince 500g",                       c: "fresh-food" },
  { n: "Pork Sausages 8pk",                             c: "fresh-food" },
  { n: "Smoked Back Bacon 300g",                        c: "fresh-food" },
  { n: "Whole British Chicken 1.6kg",                   c: "fresh-food" },
  { n: "Lamb Shoulder Joint 800g",                      c: "fresh-food" },
  { n: "King Prawns Raw 200g",                          c: "fresh-food" },
  { n: "Vine Tomatoes 500g",                            c: "fresh-food" },
  { n: "New Potatoes 1kg",                              c: "fresh-food" },
  { n: "Sourdough Bloomer Loaf 800g",                   c: "bakery" },
  { n: "Butter Croissants 4pk",                         c: "bakery" },
  { n: "Cinnamon Danish Whirls 4pk",                    c: "bakery" },
  { n: "Seeded Batch Bread 800g",                       c: "bakery" },
  { n: "White Tiger Loaf 800g",                         c: "bakery" },
  { n: "Blueberry Muffins 4pk",                         c: "bakery" },
  { n: "Pain au Chocolat 6pk",                          c: "bakery" },
  { n: "Iced Finger Buns 4pk",                          c: "bakery" },
  { n: "Brioche Burger Buns 4pk",                       c: "bakery" },
  { n: "Victoria Sponge Cake 420g",                     c: "bakery" },
  { n: "Birds Eye Fish Fingers 30pk",                   c: "frozen-food" },
  { n: "Chicken Tikka Masala Meal 400g",                c: "frozen-food" },
  { n: "Beef Lasagne Ready Meal 400g",                  c: "frozen-food" },
  { n: "Garden Peas 1kg",                               c: "frozen-food" },
  { n: "Sweetcorn Kernels 1kg",                         c: "frozen-food" },
  { n: "Chocolate Ice Cream Tub 1L",                    c: "frozen-food" },
  { n: "Quorn Mince 500g",                              c: "frozen-food" },
  { n: "Margherita Stone Baked Pizza",                  c: "frozen-food" },
  { n: "Fish & Chips Meal for 2",                       c: "frozen-food" },
  { n: "Sausage Rolls 12pk",                            c: "frozen-food" },
  { n: "Crispy Potato Waffles 10pk",                    c: "frozen-food" },
  { n: "Straight Cut Frozen Chips 2kg",                 c: "frozen-food" },
  { n: "Ready Salted Crisps Multipack",                 c: "treats-snacks" },
  { n: "Cadbury Dairy Milk 200g",                       c: "treats-snacks" },
  { n: "Digestive Biscuits 400g",                       c: "treats-snacks" },
  { n: "Pringles Original 200g",                        c: "treats-snacks" },
  { n: "Haribo Starmix 200g",                           c: "treats-snacks" },
  { n: "Milk Tray Chocolates 360g",                     c: "treats-snacks" },
  { n: "Hobnobs Original 300g",                         c: "treats-snacks" },
  { n: "KitKat 4-Finger 4pk",                          c: "treats-snacks" },
  { n: "Oreos Original 154g",                           c: "treats-snacks" },
  { n: "Peanut MMs 190g",                               c: "treats-snacks" },
  { n: "Doritos Chilli Heatwave 180g",                  c: "treats-snacks" },
  { n: "Jelly Babies Original 190g",                    c: "treats-snacks" },
  { n: "Fruit & Nut Chocolate 200g",                    c: "treats-snacks" },
  { n: "Bourbon Cream Biscuits 300g",                   c: "treats-snacks" },
  { n: "Twiglets Wheat Sticks 150g",                    c: "treats-snacks" },
  { n: "Heinz Baked Beans 4pk 415g",                   c: "food-cupboard" },
  { n: "Tilda Basmati Rice 2kg",                        c: "food-cupboard" },
  { n: "Barilla Penne Pasta 500g",                      c: "food-cupboard" },
  { n: "Heinz Tomato Ketchup 570g",                     c: "food-cupboard" },
  { n: "Extra Virgin Olive Oil 500ml",                  c: "food-cupboard" },
  { n: "Kelloggs Cornflakes 500g",                      c: "food-cupboard" },
  { n: "Meridian Smooth Peanut Butter",                 c: "food-cupboard" },
  { n: "Nescafe Original Coffee 200g",                  c: "food-cupboard" },
  { n: "PG Tips 80 Pyramid Teabags",                    c: "food-cupboard" },
  { n: "Heinz Tomato Soup 4pk 400g",                   c: "food-cupboard" },
  { n: "John West Tuna Chunks 4pk",                     c: "food-cupboard" },
  { n: "Blue Dragon Coconut Milk 400ml",                c: "food-cupboard" },
  { n: "Kikkoman Dark Soy Sauce 150ml",                 c: "food-cupboard" },
  { n: "Knorr Beef Stock Cubes 8pk",                    c: "food-cupboard" },
  { n: "Pataks Mango Chutney 360g",                     c: "food-cupboard" },
  { n: "Red Lentils 500g",                              c: "food-cupboard" },
  { n: "Plain White Flour 1.5kg",                       c: "food-cupboard" },
  { n: "Golden Caster Sugar 1kg",                       c: "food-cupboard" },
  { n: "Quaker Oat So Simple Oats 1kg",                 c: "food-cupboard" },
  { n: "Dolmio Bolognese Sauce 500g",                   c: "food-cupboard" },
  { n: "Tropicana Orange Juice 1L",                     c: "drinks" },
  { n: "Coca-Cola Original 6pk Cans",                   c: "drinks" },
  { n: "Buxton Still Water 12pk 500ml",                 c: "drinks" },
  { n: "Oatly Barista Oat Drink 1L",                   c: "drinks" },
  { n: "Clipper Organic Green Tea 20pk",                c: "drinks" },
  { n: "Ribena Blackcurrant Drink 1L",                  c: "drinks" },
  { n: "Guinness Draught 4pk Cans",                     c: "drinks" },
  { n: "Blossom Hill Rose Wine 75cl",                   c: "drinks" },
  { n: "Kopparberg Mixed Fruit Cider 4pk",              c: "drinks" },
  { n: "Red Bull Energy Drink 4pk",                     c: "drinks" },
  { n: "Vita Coco Coconut Water 1L",                    c: "drinks" },
  { n: "Belvoir Elderflower Cordial 500ml",             c: "drinks" },
  { n: "Fever-Tree Tonic Water 8pk",                    c: "drinks" },
  { n: "Alpro Almond Milk Original 1L",                 c: "drinks" },
  { n: "GTs Kombucha Ginger Lemon 330ml",               c: "drinks" },
  { n: "Head and Shoulders Classic Shampoo",            c: "health-beauty" },
  { n: "Dove Body Wash Original 250ml",                 c: "health-beauty" },
  { n: "Simple Moisturiser SPF15 125ml",                c: "health-beauty" },
  { n: "Colgate Max White Toothpaste 75ml",             c: "health-beauty" },
  { n: "Always Ultra Normal Pads 14pk",                 c: "health-beauty" },
  { n: "Radox Muscle Soak Bath Salts 900g",             c: "health-beauty" },
  { n: "Nurofen Express 200mg Tablets 16pk",            c: "health-beauty" },
  { n: "Vitamin C 1000mg Tablets 60pk",                 c: "health-beauty" },
  { n: "LOreal Elvive Conditioner 400ml",               c: "health-beauty" },
  { n: "Gillette Fusion5 Blades 4pk",                   c: "health-beauty" },
  { n: "Maybelline Fit Me Foundation 120",              c: "health-beauty" },
  { n: "CeraVe Moisturising Cream 177ml",               c: "health-beauty" },
  { n: "Fairy Original Washing Up Liquid",              c: "household" },
  { n: "Ariel 3-in-1 Pods 30pk",                       c: "household" },
  { n: "Andrex Classic White Rolls 9pk",                c: "household" },
  { n: "Domestos Original Thick Bleach",                c: "household" },
  { n: "Flash Multi-Surface Spray 800ml",               c: "household" },
  { n: "Vileda SuperMocio Mop & Bucket",                c: "household" },
  { n: "Plenty Kitchen Roll 2pk",                       c: "household" },
  { n: "Dettol Antibacterial Wipes 84pk",               c: "household" },
  { n: "Febreze Fabric Freshener 300ml",                c: "household" },
  { n: "Ecover Washing Up Liquid 1L",                   c: "household" },
  { n: "Pampers Active Fit Nappies Sz4 46pk",           c: "baby-toddler" },
  { n: "Aptamil First Infant Milk 800g",                c: "baby-toddler" },
  { n: "Ellas Kitchen Organic Pouches 8pk",             c: "baby-toddler" },
  { n: "Sudocrem Healing Cream 250g",                   c: "baby-toddler" },
  { n: "Huggies Pure Baby Wipes 12pk",                  c: "baby-toddler" },
  { n: "Calpol Infant Suspension 100ml",                c: "baby-toddler" },
  { n: "Johnsons Baby Top-to-Toe Bath",                 c: "baby-toddler" },
  { n: "MAM Anti-Colic Bottle 260ml",                   c: "baby-toddler" },
  { n: "Whiskas Cat Pouches in Gravy 12pk",             c: "pets" },
  { n: "Pedigree Adult Dry Dog Food 3kg",               c: "pets" },
  { n: "Royal Canin Indoor Cat Food 2kg",               c: "pets" },
  { n: "Dreamies Cat Treats Chicken 60g",               c: "pets" },
  { n: "Dentastix Medium Dog Treats 7pk",               c: "pets" },
  { n: "Ferplast Hamster Cage Cubo",                    c: "pets" },
  { n: "Tetra Goldfish Flake Food 52g",                 c: "pets" },
  { n: "KONG Cat Catnip Toy",                           c: "pets" },
  { n: "Microfibre Duvet Cover Set King",               c: "home-furniture" },
  { n: "Cerastone Non-Stick Frying Pan 28cm",           c: "home-furniture" },
  { n: "Kilner Clip Top Glass Jars 4pk",                c: "home-furniture" },
  { n: "LED Fairy Lights 20m Warm White",               c: "home-furniture" },
  { n: "Silentnight Healthy Fill Pillow 2pk",           c: "home-furniture" },
  { n: "Bamboo Cutting Board Large",                    c: "home-furniture" },
  { n: "Yankee Candle Vanilla Cupcake Lg",              c: "home-furniture" },
  { n: "Robert Welch Kitchen Knife Block",              c: "home-furniture" },
  { n: "Anker USB-C Charging Cable 2m",                 c: "electronics-gaming" },
  { n: "Sony WH-1000XM5 Headphones",                   c: "electronics-gaming" },
  { n: "TP-Link Smart Plug 4pk",                        c: "electronics-gaming" },
  { n: "Xbox Wireless Controller",                      c: "electronics-gaming" },
  { n: "Belkin HDMI 2.1 Cable 2m",                     c: "electronics-gaming" },
  { n: "Anker PowerCore 10000mAh Bank",                 c: "electronics-gaming" },
  { n: "Philips Hue White Smart Bulbs 3pk",             c: "electronics-gaming" },
  { n: "Duracell Optimum AA Batteries 16pk",            c: "electronics-gaming" },
  { n: "Nintendo Switch Carrying Case",                 c: "electronics-gaming" },
  { n: "Elgato Ring Light 10 Inch",                     c: "electronics-gaming" },
  { n: "Classic White Crew Neck T-Shirt",               c: "clothing-accessories" },
  { n: "Slim Fit Stretch Jeans Black",                  c: "clothing-accessories" },
  { n: "Cotton Ankle Socks 5pk Black",                  c: "clothing-accessories" },
  { n: "Natural Canvas Tote Bag",                       c: "clothing-accessories" },
  { n: "Lightweight Waterproof Rain Mac",               c: "clothing-accessories" },
  { n: "Ribbed Knit Beanie Hat Navy",                   c: "clothing-accessories" },
  { n: "Polaroid Sunglasses UV400",                     c: "clothing-accessories" },
  { n: "RFID Leather Bifold Wallet Brown",              c: "clothing-accessories" },
  { n: "LEGO Classic Creative Bricks 790",              c: "toys-games" },
  { n: "Hasbro Monopoly Classic Edition",               c: "toys-games" },
  { n: "Play-Doh Super Colour Kit 20pk",                c: "toys-games" },
  { n: "Ravensburger 1000pcs Jigsaw",                   c: "toys-games" },
  { n: "Rubik's Cube 3×3 Original",                c: "toys-games" },
  { n: "Orchard Toys Shopping List Game",               c: "toys-games" },
  { n: "Uno Ultimate Card Game",                        c: "toys-games" },
  { n: "Schleich Farm Animal Figure Set",               c: "toys-games" },
  { n: "Gaiam Yoga Mat 6mm Non-Slip",                   c: "sports-leisure" },
  { n: "Resistance Bands Set 5 Levels",                 c: "sports-leisure" },
  { n: "Adjustable Dumbbell 10kg",                      c: "sports-leisure" },
  { n: "CamelBak Chute Mag Bottle 1L",                  c: "sports-leisure" },
  { n: "Running Phone Armband iPhone",                  c: "sports-leisure" },
  { n: "Speed Jump Rope Adjustable",                    c: "sports-leisure" },
  { n: "TriggerPoint GRID Foam Roller",                 c: "sports-leisure" },
  { n: "Speedo Biofuse 2.0 Swim Goggles",               c: "sports-leisure" },
  { n: "Miracle-Gro Liquid Plant Food 1L",              c: "garden-diy-car" },
  { n: "Haws Traditional Watering Can 10L",             c: "garden-diy-car" },
  { n: "Spear & Jackson Stainless Trowel",              c: "garden-diy-car" },
  { n: "Febreze Car Air Freshener 2pk",                 c: "garden-diy-car" },
  { n: "WD-40 Multi-Use Spray 450ml",                   c: "garden-diy-car" },
  { n: "Roundup Weedkiller Ready-to-Use",               c: "garden-diy-car" },
  { n: "Winsor & Newton Watercolours 24",               c: "hobbies-stationery" },
  { n: "Paper Mate Ballpoint Pens 24pk",                c: "hobbies-stationery" },
  { n: "Fiskars Kids Craft Scissors 3pk",               c: "hobbies-stationery" },
  { n: "Post-it Notes Value Pack 12-pad",               c: "hobbies-stationery" },
  { n: "Enchanted Forest Colouring Book",               c: "hobbies-stationery" },
  { n: "Birthday Balloons 30pk Assorted",               c: "parties-seasonal" },
  { n: "Biodegradable Party Plates 20pk",               c: "parties-seasonal" },
  { n: "IKEA Glimma Tealights 100pk",                   c: "parties-seasonal" },
  { n: "Luxury Gift Wrap Paper 4 Sheets",               c: "parties-seasonal" },
  { n: "Christmas Gold Tinsel 5m 4pk",                  c: "parties-seasonal" },
  { n: "Optimum Nutrition Gold Standard Whey Vanilla 1kg", c: "marketplace" },
  { n: "Seven Seas Omega-3 Fish Oil 120pk",             c: "marketplace" },
  { n: "Himalayan Pink Salt Fine 500g",                 c: "marketplace" },
  { n: "Nescafe Dolce Gusto Cappuccino 16pk",           c: "marketplace" },
  { n: "Rowse Pure Natural Clear Honey",                c: "marketplace" },
  { n: "Amazon Gift Card 25",                           c: "kiosk" },
  { n: "Netflix 1-Month Gift Card",                     c: "kiosk" },
  { n: "Google Play Gift Card 10",                      c: "kiosk" },
  { n: "Prakash Summer BBQ Bundle",                     c: "inspiration-events" },
  { n: "Ramadan Essentials Hamper",                     c: "inspiration-events" },
  { n: "Christmas Party Starter Kit",                   c: "inspiration-events" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrap(text, charsPerLine = 22, maxLines = 2) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > charsPerLine && cur) {
      lines.push(cur);
      if (lines.length === maxLines) break;
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

// ── SVG builders ──────────────────────────────────────────────────────────────

/**
 * Square product image (main 800×800, side 600×600).
 * Layout: gradient bg → decorative arcs → circle+abbr → product name → badge
 */
function svgSquare(name, cat, badge, w, h) {
  const { g1, g2, accent, fg, abbr } = cat;
  const cx   = w / 2;
  const r    = Math.round(w * 0.24);   // main circle radius
  const cy   = Math.round(h * 0.38);   // circle center Y
  const abSz = Math.round(w * 0.14);   // abbr font size
  const nmSz = Math.round(w * 0.034);  // name font size
  const lines = wrap(name, 22, 2);
  const nmBaseY = cy + r + Math.round(h * 0.09);
  const nmLineH = Math.round(nmSz * 1.45);
  const bH = Math.round(h * 0.034);
  const bW = Math.max(56, badge.length * Math.round(w * 0.011) + 28);
  const bR = bH / 2;
  const bCX = bW / 2 + 22;

  const nameLines = lines.map((l, i) =>
    `<text x="${cx}" y="${nmBaseY + i * nmLineH}" font-family="${FONT}" font-size="${nmSz}" font-weight="600" fill="${fg}" text-anchor="middle">${escXml(l)}</text>`
  ).join("\n  ");

  const brandY = Math.round(h * 0.954);

  // Decorative arc (quarter-circle stroke in top-right corner)
  const arcR = Math.round(w * 0.38);
  const arcX = w + arcR * 0.2;
  const arcY = -arcR * 0.2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <linearGradient id="ci" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.30"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <!-- Decorative corner arcs -->
  <circle cx="${arcX}" cy="${arcY}" r="${arcR}" fill="none" stroke="${accent}" stroke-width="${Math.round(w * 0.008)}" stroke-opacity="0.12"/>
  <circle cx="${-Math.round(w*0.1)}" cy="${h + Math.round(h*0.1)}" r="${Math.round(w*0.3)}" fill="none" stroke="${accent}" stroke-width="${Math.round(w*0.006)}" stroke-opacity="0.09"/>
  <!-- White card area -->
  <rect x="${Math.round(w*0.075)}" y="${Math.round(h*0.075)}" width="${Math.round(w*0.85)}" height="${Math.round(h*0.85)}" rx="${Math.round(w*0.04)}" fill="white" fill-opacity="0.42"/>
  <!-- Category circle -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#ci)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.25"/>
  <!-- Abbreviation -->
  <text x="${cx}" y="${cy}" font-family="${FONT}" font-size="${abSz}" font-weight="800" fill="${accent}" fill-opacity="0.75" text-anchor="middle" dominant-baseline="middle">${escXml(abbr)}</text>
  <!-- Product name -->
  ${nameLines}
  <!-- Type badge -->
  <rect x="22" y="22" width="${bW}" height="${bH}" rx="${bR}" fill="${accent}" fill-opacity="0.88"/>
  <text x="${bCX}" y="${22 + bH / 2}" font-family="${FONT}" font-size="${Math.round(bH * 0.44)}" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${badge}</text>
  <!-- Brand -->
  <text x="${cx}" y="${brandY}" font-family="${FONT}" font-size="${Math.round(w * 0.016)}" fill="${accent}" fill-opacity="0.50" text-anchor="middle">Prakash Supermarket</text>
</svg>`;
}

/**
 * Landscape lifestyle image (1200×600).
 * Left: large circle + abbr. Right: product name + category.
 */
function svgLifestyle(name, cat) {
  const { g1, g2, accent, fg, abbr, name: catName } = cat;
  const lines = wrap(name, 20, 2);
  const nmY1 = lines.length === 2 ? 242 : 280;

  const nameLines = lines.map((l, i) =>
    `<text x="840" y="${nmY1 + i * 56}" font-family="${FONT}" font-size="40" font-weight="700" fill="${fg}" text-anchor="middle">${escXml(l)}</text>`
  ).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <linearGradient id="ci" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.30"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="600" fill="url(#bg)"/>
  <circle cx="1100" cy="80"  r="280" fill="none" stroke="${accent}" stroke-width="8" stroke-opacity="0.10"/>
  <circle cx="100"  cy="520" r="200" fill="none" stroke="${accent}" stroke-width="6" stroke-opacity="0.08"/>
  <!-- Left panel -->
  <rect x="36" y="36" width="528" height="528" rx="28" fill="white" fill-opacity="0.38"/>
  <circle cx="300" cy="300" r="170" fill="url(#ci)"/>
  <circle cx="300" cy="300" r="170" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.25"/>
  <text x="300" y="300" font-family="${FONT}" font-size="100" font-weight="800" fill="${accent}" fill-opacity="0.75" text-anchor="middle" dominant-baseline="middle">${escXml(abbr)}</text>
  <!-- Right panel -->
  <rect x="600" y="36" width="564" height="528" rx="28" fill="white" fill-opacity="0.28"/>
  ${nameLines}
  <text x="840" y="${nmY1 + lines.length * 56 + 36}" font-family="${FONT}" font-size="20" fill="${accent}" text-anchor="middle" fill-opacity="0.75">${escXml(catName)}</text>
  <!-- LIFESTYLE badge -->
  <rect x="616" y="22" width="128" height="28" rx="14" fill="${accent}" fill-opacity="0.90"/>
  <text x="680" y="36" font-family="${FONT}" font-size="12" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">LIFESTYLE</text>
  <text x="840" y="572" font-family="${FONT}" font-size="13" fill="${accent}" fill-opacity="0.50" text-anchor="middle">Prakash Supermarket</text>
</svg>`;
}

/**
 * Closeup image (500×500) — fills the frame with a large circle.
 */
function svgCloseup(name, cat) {
  const { g1, g2, accent, fg, abbr } = cat;
  const lines = wrap(name, 20, 1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
  <defs>
    <linearGradient id="bg" x1="1" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <linearGradient id="ci" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.38"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="url(#bg)"/>
  <circle cx="250" cy="232" r="192" fill="url(#ci)"/>
  <circle cx="250" cy="232" r="192" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.22"/>
  <!-- Outer decorative ring -->
  <circle cx="250" cy="232" r="220" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.10"/>
  <text x="250" y="232" font-family="${FONT}" font-size="120" font-weight="800" fill="${accent}" fill-opacity="0.72" text-anchor="middle" dominant-baseline="middle">${escXml(abbr)}</text>
  <text x="250" y="452" font-family="${FONT}" font-size="18" font-weight="600" fill="${fg}" fill-opacity="0.82" text-anchor="middle">${escXml(lines[0] ?? name.slice(0, 24))}</text>
  <rect x="14" y="14" width="90" height="26" rx="13" fill="${accent}" fill-opacity="0.90"/>
  <text x="59" y="27" font-family="${FONT}" font-size="10" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">CLOSEUP</text>
</svg>`;
}

/**
 * Category banner image (600×400).
 */
function svgCategory(cat) {
  const { g1, g2, accent, fg, abbr, name } = cat;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <linearGradient id="ci" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.32"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#bg)"/>
  <circle cx="520" cy="60"  r="160" fill="none" stroke="${accent}" stroke-width="7" stroke-opacity="0.10"/>
  <circle cx="80"  cy="340" r="120" fill="none" stroke="${accent}" stroke-width="5" stroke-opacity="0.08"/>
  <rect x="36" y="36" width="528" height="328" rx="20" fill="white" fill-opacity="0.38"/>
  <!-- Circle left -->
  <circle cx="170" cy="200" r="110" fill="url(#ci)"/>
  <circle cx="170" cy="200" r="110" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.22"/>
  <text x="170" y="200" font-family="${FONT}" font-size="72" font-weight="800" fill="${accent}" fill-opacity="0.78" text-anchor="middle" dominant-baseline="middle">${escXml(abbr)}</text>
  <!-- Name right -->
  <text x="380" y="188" font-family="${FONT}" font-size="34" font-weight="800" fill="${fg}" text-anchor="middle">${escXml(name)}</text>
  <rect x="292" y="210" width="176" height="3" rx="1.5" fill="${accent}" fill-opacity="0.30"/>
  <text x="380" y="248" font-family="${FONT}" font-size="15" fill="${accent}" fill-opacity="0.70" text-anchor="middle">Shop the range</text>
  <text x="300" y="376" font-family="${FONT}" font-size="12" fill="${accent}" fill-opacity="0.45" text-anchor="middle">Prakash Supermarket</text>
</svg>`;
}

/**
 * Generic placeholder image (800×800).
 */
function svgPlaceholder() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <rect width="800" height="800" fill="#f9fafb"/>
  <circle cx="700" cy="100" r="250" fill="none" stroke="#d1d5db" stroke-width="8" stroke-opacity="0.6"/>
  <circle cx="100" cy="700" r="200" fill="none" stroke="#d1d5db" stroke-width="6" stroke-opacity="0.5"/>
  <rect x="60" y="60" width="680" height="680" rx="28" fill="white" fill-opacity="0.55"/>
  <circle cx="400" cy="330" r="160" fill="#f3f4f6"/>
  <circle cx="400" cy="330" r="160" fill="none" stroke="#d1d5db" stroke-width="2"/>
  <text x="400" y="330" font-family="${FONT}" font-size="90" font-weight="800" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">PS</text>
  <text x="400" y="550" font-family="${FONT}" font-size="26" fill="#9ca3af" text-anchor="middle">Product Image</text>
  <text x="400" y="762" font-family="${FONT}" font-size="13" fill="#d1d5db" text-anchor="middle">Prakash Supermarket</text>
</svg>`;
}

// ── Conversion ─────────────────────────────────────────────────────────────────

async function toWebP(svgString, outPath) {
  await sharp(Buffer.from(svgString)).webp({ quality: 85, effort: 4 }).toFile(outPath);
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function run() {
  const t0 = Date.now();

  await mkdir(PRODUCTS_DIR,   { recursive: true });
  await mkdir(CATEGORIES_DIR, { recursive: true });

  const total  = 1 + Object.keys(CATS).length + PRODUCTS.length * 4;
  let done     = 0;
  const errors = [];

  function tick() {
    done++;
    if (done % 20 === 0 || done === total) {
      process.stdout.write(`\r  ${done}/${total} images generated…`);
    }
  }

  // 1. Placeholder
  try { await toWebP(svgPlaceholder(), path.join(ROOT, "public", "images", "placeholder-product.webp")); }
  catch (e) { errors.push(`placeholder: ${e.message}`); }
  tick();

  // 2. Categories
  for (const [slug, meta] of Object.entries(CATS)) {
    try { await toWebP(svgCategory(meta), path.join(CATEGORIES_DIR, `${slug}.webp`)); }
    catch (e) { errors.push(`category/${slug}: ${e.message}`); }
    tick();
  }

  // 3. Products — batch 8 at a time
  const BATCH = 8;
  for (let i = 0; i < PRODUCTS.length; i += BATCH) {
    await Promise.all(
      PRODUCTS.slice(i, i + BATCH).map(async ({ n, c }) => {
        const slug = toSlug(n);
        const cat  = CATS[c] ?? CATS["marketplace"];
        const dir  = path.join(PRODUCTS_DIR, slug);
        try {
          await mkdir(dir, { recursive: true });
          await Promise.all([
            toWebP(svgSquare(n, cat, "MAIN",    800, 800), path.join(dir, "main.webp")),
            toWebP(svgSquare(n, cat, "SIDE",    600, 600), path.join(dir, "side.webp")),
            toWebP(svgLifestyle(n, cat),                    path.join(dir, "lifestyle.webp")),
            toWebP(svgCloseup(n, cat),                      path.join(dir, "closeup.webp")),
          ]);
        } catch (e) { errors.push(`product/${slug}: ${e.message}`); }
        tick(); tick(); tick(); tick();
      })
    );
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n  Done — ${done} images in ${elapsed}s`);

  if (errors.length) {
    console.warn(`\n  ${errors.length} error(s):`);
    errors.forEach((e) => console.warn(`    - ${e}`));
    process.exit(1);
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
