/**
 * scripts/fetch-product-images.mjs
 *
 * Fetches real product/category images from randomimageurl.com (Unsplash-backed)
 * and updates every Category.image and Product.images[] field in MongoDB.
 *
 * Categories  → 1 image  (stored in Category.image)
 * Products    → 4 images (stored in Product.images[])
 *
 * Run:
 *   node scripts/fetch-product-images.mjs
 *   npm run fetch-images
 */

import mongoose from "mongoose";

// ── Config ────────────────────────────────────────────────────────────────────

const MONGODB_URI =
  "mongodb+srv://tesco_app_user:gBybu2tWLja2Y3zA@cluster0.gis5coo.mongodb.net/tesco-grocery?retryWrites=true&w=majority&appName=Cluster0";

const API_BASE = "https://randomimageurl.com/api/search.php";
const DELAY_MS = 350; // polite delay between API calls

// ── Category search terms ─────────────────────────────────────────────────────

const CATEGORY_TERMS = {
  "fresh-food":           "fresh vegetables fruits grocery",
  "bakery":               "fresh bread bakery pastry",
  "frozen-food":          "frozen food supermarket",
  "treats-snacks":        "snacks chocolate candy crisps",
  "food-cupboard":        "pantry canned food grocery",
  "drinks":               "drinks beverages bottles",
  "health-beauty":        "health beauty skincare cosmetics",
  "household":            "cleaning household products",
  "baby-toddler":         "baby products nursery toddler",
  "pets":                 "pet dog cat animals",
  "home-furniture":       "home furniture interior living room",
  "electronics-gaming":   "electronics gaming technology gadgets",
  "clothing-accessories": "clothing fashion accessories style",
  "toys-games":           "toys games children play",
  "sports-leisure":       "sports fitness gym exercise",
  "garden-diy-car":       "garden plants tools outdoor",
  "hobbies-stationery":   "art craft stationery office supplies",
  "parties-seasonal":     "party celebration decorations festive",
  "marketplace":          "online shopping marketplace products",
  "kiosk":                "gift cards vouchers digital",
  "inspiration-events":   "seasonal events inspiration lifestyle",
};

// ── Product list (all 204) ────────────────────────────────────────────────────

const PRODUCTS = [
  // Fresh Food (25)
  "Organic Whole Milk 2L",
  "Free Range Large Eggs 6pk",
  "Baby Spinach Leaves 200g",
  "Cherry Tomatoes 250g",
  "British Chicken Breast Fillets",
  "Scottish Salmon Fillet 240g",
  "Greek Style Yogurt 500g",
  "Unsalted Butter 250g",
  "Mature Cheddar Cheese 400g",
  "Ripe Avocados 2pk",
  "Braeburn Apples 6pk",
  "Chantenay Carrots 500g",
  "Chestnut Mushrooms 250g",
  "Tenderstem Broccoli 200g",
  "British Strawberries 400g",
  "Full Fat Cream Cheese 200g",
  "Soured Cream 300ml",
  "British Beef Mince 500g",
  "Pork Sausages 8pk",
  "Smoked Back Bacon 300g",
  "Whole British Chicken 1.6kg",
  "Lamb Shoulder Joint 800g",
  "King Prawns Raw 200g",
  "Vine Tomatoes 500g",
  "New Potatoes 1kg",
  // Bakery (10)
  "Sourdough Bloomer Loaf 800g",
  "Butter Croissants 4pk",
  "Cinnamon Danish Whirls 4pk",
  "Seeded Batch Bread 800g",
  "White Tiger Loaf 800g",
  "Blueberry Muffins 4pk",
  "Pain au Chocolat 6pk",
  "Iced Finger Buns 4pk",
  "Brioche Burger Buns 4pk",
  "Victoria Sponge Cake 420g",
  // Frozen Food (12)
  "Birds Eye Fish Fingers 30pk",
  "Chicken Tikka Masala Meal 400g",
  "Beef Lasagne Ready Meal 400g",
  "Garden Peas 1kg",
  "Sweetcorn Kernels 1kg",
  "Chocolate Ice Cream Tub 1L",
  "Quorn Mince 500g",
  "Margherita Stone Baked Pizza",
  "Fish & Chips Meal for 2",
  "Sausage Rolls 12pk",
  "Crispy Potato Waffles 10pk",
  "Straight Cut Frozen Chips 2kg",
  // Treats & Snacks (15)
  "Ready Salted Crisps Multipack",
  "Cadbury Dairy Milk 200g",
  "Digestive Biscuits 400g",
  "Pringles Original 200g",
  "Haribo Starmix 200g",
  "Milk Tray Chocolates 360g",
  "Hobnobs Original 300g",
  "KitKat 4-Finger 4pk",
  "Oreos Original 154g",
  "Peanut MMs 190g",
  "Doritos Chilli Heatwave 180g",
  "Jelly Babies Original 190g",
  "Fruit & Nut Chocolate 200g",
  "Bourbon Cream Biscuits 300g",
  "Twiglets Wheat Sticks 150g",
  // Food Cupboard (20)
  "Heinz Baked Beans 4pk 415g",
  "Tilda Basmati Rice 2kg",
  "Barilla Penne Pasta 500g",
  "Heinz Tomato Ketchup 570g",
  "Extra Virgin Olive Oil 500ml",
  "Kelloggs Cornflakes 500g",
  "Meridian Smooth Peanut Butter",
  "Nescafe Original Coffee 200g",
  "PG Tips 80 Pyramid Teabags",
  "Heinz Tomato Soup 4pk 400g",
  "John West Tuna Chunks 4pk",
  "Blue Dragon Coconut Milk 400ml",
  "Kikkoman Dark Soy Sauce 150ml",
  "Knorr Beef Stock Cubes 8pk",
  "Pataks Mango Chutney 360g",
  "Red Lentils 500g",
  "Plain White Flour 1.5kg",
  "Golden Caster Sugar 1kg",
  "Quaker Oat So Simple Oats 1kg",
  "Dolmio Bolognese Sauce 500g",
  // Drinks (15)
  "Tropicana Orange Juice 1L",
  "Coca-Cola Original 6pk Cans",
  "Buxton Still Water 12pk 500ml",
  "Oatly Barista Oat Drink 1L",
  "Clipper Organic Green Tea 20pk",
  "Ribena Blackcurrant Drink 1L",
  "Guinness Draught 4pk Cans",
  "Blossom Hill Rose Wine 75cl",
  "Kopparberg Mixed Fruit Cider 4pk",
  "Red Bull Energy Drink 4pk",
  "Vita Coco Coconut Water 1L",
  "Belvoir Elderflower Cordial 500ml",
  "Fever-Tree Tonic Water 8pk",
  "Alpro Almond Milk Original 1L",
  "GTs Kombucha Ginger Lemon 330ml",
  // Health & Beauty (12)
  "Head and Shoulders Classic Shampoo",
  "Dove Body Wash Original 250ml",
  "Simple Moisturiser SPF15 125ml",
  "Colgate Max White Toothpaste 75ml",
  "Always Ultra Normal Pads 14pk",
  "Radox Muscle Soak Bath Salts 900g",
  "Nurofen Express 200mg Tablets 16pk",
  "Vitamin C 1000mg Tablets 60pk",
  "LOreal Elvive Conditioner 400ml",
  "Gillette Fusion5 Blades 4pk",
  "Maybelline Fit Me Foundation 120",
  "CeraVe Moisturising Cream 177ml",
  // Household (10)
  "Fairy Original Washing Up Liquid",
  "Ariel 3-in-1 Pods 30pk",
  "Andrex Classic White Rolls 9pk",
  "Domestos Original Thick Bleach",
  "Flash Multi-Surface Spray 800ml",
  "Vileda SuperMocio Mop & Bucket",
  "Plenty Kitchen Roll 2pk",
  "Dettol Antibacterial Wipes 84pk",
  "Febreze Fabric Freshener 300ml",
  "Ecover Washing Up Liquid 1L",
  // Baby & Toddler (8)
  "Pampers Active Fit Nappies Sz4 46pk",
  "Aptamil First Infant Milk 800g",
  "Ellas Kitchen Organic Pouches 8pk",
  "Sudocrem Healing Cream 250g",
  "Huggies Pure Baby Wipes 12pk",
  "Calpol Infant Suspension 100ml",
  "Johnsons Baby Top-to-Toe Bath",
  "MAM Anti-Colic Bottle 260ml",
  // Pets (8)
  "Whiskas Cat Pouches in Gravy 12pk",
  "Pedigree Adult Dry Dog Food 3kg",
  "Royal Canin Indoor Cat Food 2kg",
  "Dreamies Cat Treats Chicken 60g",
  "Dentastix Medium Dog Treats 7pk",
  "Ferplast Hamster Cage Cubo",
  "Tetra Goldfish Flake Food 52g",
  "KONG Cat Catnip Toy",
  // Home & Furniture (8)
  "Microfibre Duvet Cover Set King",
  "Cerastone Non-Stick Frying Pan 28cm",
  "Kilner Clip Top Glass Jars 4pk",
  "LED Fairy Lights 20m Warm White",
  "Silentnight Healthy Fill Pillow 2pk",
  "Bamboo Cutting Board Large",
  "Yankee Candle Vanilla Cupcake Lg",
  "Robert Welch Kitchen Knife Block",
  // Electronics & Gaming (10)
  "Anker USB-C Charging Cable 2m",
  "Sony WH-1000XM5 Headphones",
  "TP-Link Smart Plug 4pk",
  "Xbox Wireless Controller",
  "Belkin HDMI 2.1 Cable 2m",
  "Anker PowerCore 10000mAh Bank",
  "Philips Hue White Smart Bulbs 3pk",
  "Duracell Optimum AA Batteries 16pk",
  "Nintendo Switch Carrying Case",
  "Elgato Ring Light 10 Inch",
  // Clothing & Accessories (8)
  "Classic White Crew Neck T-Shirt",
  "Slim Fit Stretch Jeans Black",
  "Cotton Ankle Socks 5pk Black",
  "Natural Canvas Tote Bag",
  "Lightweight Waterproof Rain Mac",
  "Ribbed Knit Beanie Hat Navy",
  "Polaroid Sunglasses UV400",
  "RFID Leather Bifold Wallet Brown",
  // Toys & Games (8)
  "LEGO Classic Creative Bricks 790",
  "Hasbro Monopoly Classic Edition",
  "Play-Doh Super Colour Kit 20pk",
  "Ravensburger 1000pcs Jigsaw",
  "Rubiks Cube 3x3 Original",
  "Orchard Toys Shopping List Game",
  "Uno Ultimate Card Game",
  "Schleich Farm Animal Figure Set",
  // Sports & Leisure (8)
  "Gaiam Yoga Mat 6mm Non-Slip",
  "Resistance Bands Set 5 Levels",
  "Adjustable Dumbbell 10kg",
  "CamelBak Chute Mag Bottle 1L",
  "Running Phone Armband iPhone",
  "Speed Jump Rope Adjustable",
  "TriggerPoint GRID Foam Roller",
  "Speedo Biofuse 2.0 Swim Goggles",
  // Garden DIY & Car (6)
  "Miracle-Gro Liquid Plant Food 1L",
  "Haws Traditional Watering Can 10L",
  "Spear & Jackson Stainless Trowel",
  "Febreze Car Air Freshener 2pk",
  "WD-40 Multi-Use Spray 450ml",
  "Roundup Weedkiller Ready-to-Use",
  // Hobbies & Stationery (5)
  "Winsor & Newton Watercolours 24",
  "Paper Mate Ballpoint Pens 24pk",
  "Fiskars Kids Craft Scissors 3pk",
  "Post-it Notes Value Pack 12-pad",
  "Enchanted Forest Colouring Book",
  // Parties & Seasonal (5)
  "Birthday Balloons 30pk Assorted",
  "Biodegradable Party Plates 20pk",
  "IKEA Glimma Tealights 100pk",
  "Luxury Gift Wrap Paper 4 Sheets",
  "Christmas Gold Tinsel 5m 4pk",
  // Marketplace (5)
  "Optimum Nutrition Gold Standard Whey Vanilla 1kg",
  "Seven Seas Omega-3 Fish Oil 120pk",
  "Himalayan Pink Salt Fine 500g",
  "Nescafe Dolce Gusto Cappuccino 16pk",
  "Rowse Pure Natural Clear Honey",
  // Kiosk (3)
  "Amazon Gift Card 25",
  "Netflix 1-Month Gift Card",
  "Google Play Gift Card 10",
  // Inspiration & Events (3)
  "Prakash Summer BBQ Bundle",
  "Ramadan Essentials Hamper",
  "Christmas Party Starter Kit",
];

// ── Search term extractor ─────────────────────────────────────────────────────

// Map of product name fragments → better search keywords
const KEYWORD_OVERRIDES = {
  "Organic Whole Milk":          "fresh organic milk bottle",
  "Free Range Large Eggs":       "free range eggs",
  "Baby Spinach":                "fresh spinach leaves",
  "Cherry Tomatoes":             "cherry tomatoes",
  "British Chicken Breast":      "chicken breast fillet",
  "Scottish Salmon Fillet":      "salmon fillet fish",
  "Greek Style Yogurt":          "greek yogurt pot",
  "Unsalted Butter":             "butter dairy",
  "Mature Cheddar Cheese":       "cheddar cheese block",
  "Ripe Avocados":               "ripe avocado",
  "Braeburn Apples":             "fresh apples",
  "Chantenay Carrots":           "baby carrots",
  "Chestnut Mushrooms":          "mushrooms",
  "Tenderstem Broccoli":         "broccoli vegetable",
  "British Strawberries":        "fresh strawberries",
  "Full Fat Cream Cheese":       "cream cheese",
  "Soured Cream":                "sour cream",
  "British Beef Mince":          "minced beef meat",
  "Pork Sausages":               "pork sausages",
  "Smoked Back Bacon":           "bacon rashers",
  "Whole British Chicken":       "whole chicken roast",
  "Lamb Shoulder Joint":         "lamb joint meat",
  "King Prawns Raw":             "raw king prawns seafood",
  "Vine Tomatoes":               "vine tomatoes",
  "New Potatoes":                "new potatoes",
  "Sourdough Bloomer Loaf":      "sourdough bread loaf",
  "Butter Croissants":           "croissants pastry",
  "Cinnamon Danish Whirls":      "danish pastry",
  "Seeded Batch Bread":          "seeded bread loaf",
  "White Tiger Loaf":            "white bread loaf",
  "Blueberry Muffins":           "blueberry muffins",
  "Pain au Chocolat":            "pain au chocolat chocolate croissant",
  "Iced Finger Buns":            "iced buns bakery",
  "Brioche Burger Buns":         "brioche buns",
  "Victoria Sponge Cake":        "victoria sponge cake",
  "Birds Eye Fish Fingers":      "fish fingers",
  "Chicken Tikka Masala Meal":   "chicken tikka masala curry",
  "Beef Lasagne Ready Meal":     "beef lasagne pasta",
  "Garden Peas":                 "frozen peas",
  "Sweetcorn Kernels":           "sweetcorn kernels",
  "Chocolate Ice Cream Tub":     "chocolate ice cream",
  "Quorn Mince":                 "quorn vegetarian mince",
  "Margherita Stone Baked Pizza":"margherita pizza",
  "Fish & Chips Meal":           "fish and chips meal",
  "Sausage Rolls":               "sausage rolls pastry",
  "Crispy Potato Waffles":       "potato waffles",
  "Straight Cut Frozen Chips":   "frozen chips fries",
  "Ready Salted Crisps":         "crisps potato chips",
  "Cadbury Dairy Milk":          "chocolate bar cadbury",
  "Digestive Biscuits":          "digestive biscuits",
  "Pringles Original":           "pringles crisps tube",
  "Haribo Starmix":              "haribo gummy sweets",
  "Milk Tray Chocolates":        "chocolate box assortment",
  "Hobnobs Original":            "hobnob biscuits",
  "KitKat 4-Finger":             "kitkat chocolate bar",
  "Oreos Original":              "oreo cookies biscuits",
  "Peanut MMs":                  "peanut chocolate candy",
  "Doritos Chilli Heatwave":     "doritos tortilla chips",
  "Jelly Babies Original":       "jelly babies sweets candy",
  "Fruit & Nut Chocolate":       "fruit nut chocolate bar",
  "Bourbon Cream Biscuits":      "bourbon cream biscuits",
  "Twiglets Wheat Sticks":       "twiglets wheat snack",
  "Heinz Baked Beans":           "baked beans tin can",
  "Tilda Basmati Rice":          "basmati rice bag",
  "Barilla Penne Pasta":         "penne pasta",
  "Heinz Tomato Ketchup":        "tomato ketchup bottle",
  "Extra Virgin Olive Oil":      "olive oil bottle",
  "Kelloggs Cornflakes":         "cornflakes cereal",
  "Meridian Smooth Peanut Butter":"peanut butter jar",
  "Nescafe Original Coffee":     "instant coffee jar",
  "PG Tips":                     "tea bags",
  "Heinz Tomato Soup":           "tomato soup can",
  "John West Tuna Chunks":       "tuna tin can",
  "Blue Dragon Coconut Milk":    "coconut milk can",
  "Kikkoman Dark Soy Sauce":     "soy sauce bottle",
  "Knorr Beef Stock Cubes":      "stock cubes cooking",
  "Pataks Mango Chutney":        "mango chutney jar",
  "Red Lentils":                 "red lentils legumes",
  "Plain White Flour":           "flour bag baking",
  "Golden Caster Sugar":         "caster sugar baking",
  "Quaker Oat So Simple Oats":   "porridge oats",
  "Dolmio Bolognese Sauce":      "pasta sauce jar",
  "Tropicana Orange Juice":      "orange juice carton",
  "Coca-Cola Original":          "coca cola cans",
  "Buxton Still Water":          "water bottles",
  "Oatly Barista Oat Drink":     "oat milk barista",
  "Clipper Organic Green Tea":   "green tea bags",
  "Ribena Blackcurrant Drink":   "ribena blackcurrant drink",
  "Guinness Draught":            "guinness beer cans",
  "Blossom Hill Rose Wine":      "rose wine bottle",
  "Kopparberg Mixed Fruit Cider":"cider fruit drinks",
  "Red Bull Energy Drink":       "red bull energy drink",
  "Vita Coco Coconut Water":     "coconut water",
  "Belvoir Elderflower Cordial": "elderflower cordial",
  "Fever-Tree Tonic Water":      "tonic water",
  "Alpro Almond Milk Original":  "almond milk carton",
  "GTs Kombucha":                "kombucha fermented drink",
  "Head and Shoulders Classic Shampoo": "shampoo bottle hair",
  "Dove Body Wash Original":     "body wash shower gel",
  "Simple Moisturiser":          "face moisturiser skincare",
  "Colgate Max White Toothpaste":"toothpaste tube",
  "Always Ultra Normal Pads":    "feminine hygiene pads",
  "Radox Muscle Soak Bath Salts":"bath salts relaxation",
  "Nurofen Express":             "pain relief tablets",
  "Vitamin C":                   "vitamin c tablets supplement",
  "LOreal Elvive Conditioner":   "hair conditioner loreal",
  "Gillette Fusion5 Blades":     "razor blades shaving",
  "Maybelline Fit Me Foundation":"foundation makeup cosmetics",
  "CeraVe Moisturising Cream":   "cerave moisturiser cream",
  "Fairy Original Washing Up Liquid": "washing up liquid dish soap",
  "Ariel 3-in-1 Pods":          "laundry pods washing",
  "Andrex Classic White Rolls":  "toilet paper rolls",
  "Domestos Original Thick Bleach": "bleach cleaning",
  "Flash Multi-Surface Spray":   "cleaning spray household",
  "Vileda SuperMocio Mop":       "mop bucket cleaning",
  "Plenty Kitchen Roll":         "kitchen roll paper towel",
  "Dettol Antibacterial Wipes":  "antibacterial wipes cleaning",
  "Febreze Fabric Freshener":    "fabric freshener spray",
  "Ecover Washing Up Liquid":    "eco washing up liquid",
  "Pampers Active Fit Nappies":  "baby nappies diapers",
  "Aptamil First Infant Milk":   "baby formula infant milk",
  "Ellas Kitchen Organic Pouches":"baby food organic pouch",
  "Sudocrem Healing Cream":      "baby cream nappy rash",
  "Huggies Pure Baby Wipes":     "baby wipes",
  "Calpol Infant Suspension":    "baby medicine",
  "Johnsons Baby Top-to-Toe Bath":"baby bath wash",
  "MAM Anti-Colic Bottle":       "baby bottle feeding",
  "Whiskas Cat Pouches":         "cat food wet pouches",
  "Pedigree Adult Dry Dog Food": "dog food dry kibble",
  "Royal Canin Indoor Cat Food": "cat food premium",
  "Dreamies Cat Treats Chicken": "cat treats",
  "Dentastix Medium Dog Treats": "dog dental treats",
  "Ferplast Hamster Cage":       "hamster cage small animal",
  "Tetra Goldfish Flake Food":   "goldfish fish food",
  "KONG Cat Catnip Toy":         "cat toy catnip",
  "Microfibre Duvet Cover Set":  "duvet cover bedding set",
  "Cerastone Non-Stick Frying Pan": "frying pan non-stick cookware",
  "Kilner Clip Top Glass Jars":  "glass jar storage",
  "LED Fairy Lights":            "fairy lights led warm white",
  "Silentnight Healthy Fill Pillow": "pillow bedroom",
  "Bamboo Cutting Board Large":  "bamboo cutting board kitchen",
  "Yankee Candle Vanilla Cupcake":"scented candle",
  "Robert Welch Kitchen Knife Block": "knife block kitchen",
  "Anker USB-C Charging Cable":  "usb c cable charging",
  "Sony WH-1000XM5 Headphones":  "wireless headphones sony",
  "TP-Link Smart Plug":          "smart plug wifi",
  "Xbox Wireless Controller":    "xbox controller gaming",
  "Belkin HDMI 2.1 Cable":       "hdmi cable",
  "Anker PowerCore":             "power bank portable charger",
  "Philips Hue White Smart Bulbs":"smart bulbs philips hue",
  "Duracell Optimum AA Batteries":"aa batteries duracell",
  "Nintendo Switch Carrying Case":"nintendo switch accessories",
  "Elgato Ring Light":           "ring light streaming studio",
  "Classic White Crew Neck T-Shirt": "white t-shirt clothing",
  "Slim Fit Stretch Jeans Black": "black jeans slim fit",
  "Cotton Ankle Socks":          "ankle socks cotton",
  "Natural Canvas Tote Bag":     "canvas tote bag",
  "Lightweight Waterproof Rain Mac": "waterproof rain jacket mac",
  "Ribbed Knit Beanie Hat Navy": "beanie hat knit",
  "Polaroid Sunglasses UV400":   "sunglasses polaroid",
  "RFID Leather Bifold Wallet Brown": "leather wallet brown",
  "LEGO Classic Creative Bricks":"lego bricks toy",
  "Hasbro Monopoly Classic Edition": "monopoly board game",
  "Play-Doh Super Colour Kit":   "play doh modelling clay",
  "Ravensburger 1000pcs Jigsaw": "jigsaw puzzle pieces",
  "Rubiks Cube 3x3 Original":    "rubiks cube puzzle",
  "Orchard Toys Shopping List Game": "children shopping game toy",
  "Uno Ultimate Card Game":      "uno card game",
  "Schleich Farm Animal Figure Set": "farm animal toy figures",
  "Gaiam Yoga Mat 6mm Non-Slip": "yoga mat non-slip",
  "Resistance Bands Set 5 Levels":"resistance bands exercise",
  "Adjustable Dumbbell 10kg":    "dumbbell weights fitness",
  "CamelBak Chute Mag Bottle":   "water bottle sports",
  "Running Phone Armband iPhone": "phone armband running",
  "Speed Jump Rope Adjustable":  "jump rope skipping",
  "TriggerPoint GRID Foam Roller":"foam roller massage",
  "Speedo Biofuse 2.0 Swim Goggles": "swimming goggles pool",
  "Miracle-Gro Liquid Plant Food":"plant food fertilizer",
  "Haws Traditional Watering Can":"watering can garden",
  "Spear & Jackson Stainless Trowel": "garden trowel tool",
  "Febreze Car Air Freshener":   "car air freshener",
  "WD-40 Multi-Use Spray":       "wd40 lubricant spray",
  "Roundup Weedkiller Ready-to-Use": "weedkiller garden",
  "Winsor & Newton Watercolours":"watercolour paints art",
  "Paper Mate Ballpoint Pens":   "ballpoint pens stationery",
  "Fiskars Kids Craft Scissors": "craft scissors children",
  "Post-it Notes Value Pack":    "post-it notes sticky",
  "Enchanted Forest Colouring Book": "colouring book adult",
  "Birthday Balloons 30pk Assorted": "birthday balloons colourful",
  "Biodegradable Party Plates":  "party plates eco",
  "IKEA Glimma Tealights":       "tealight candles",
  "Luxury Gift Wrap Paper":      "gift wrapping paper",
  "Christmas Gold Tinsel":       "christmas tinsel gold festive",
  "Optimum Nutrition Gold Standard Whey Vanilla": "protein powder whey",
  "Seven Seas Omega-3 Fish Oil": "fish oil omega 3 supplement",
  "Himalayan Pink Salt Fine":    "himalayan pink salt",
  "Nescafe Dolce Gusto Cappuccino": "cappuccino coffee pods",
  "Rowse Pure Natural Clear Honey": "honey jar natural",
  "Amazon Gift Card":            "amazon gift card",
  "Netflix 1-Month Gift Card":   "netflix gift card streaming",
  "Google Play Gift Card":       "google play gift card",
  "Prakash Summer BBQ Bundle":   "summer barbecue grill food",
  "Ramadan Essentials Hamper":   "ramadan food hamper",
  "Christmas Party Starter Kit": "christmas party festive decorations",
};

function getSearchTerm(name) {
  // Try prefix match in overrides
  for (const [fragment, term] of Object.entries(KEYWORD_OVERRIDES)) {
    if (name.startsWith(fragment)) return term;
  }
  // Fallback: strip sizes/quantities/model numbers
  return name
    .replace(/\b\d+(\.\d+)?\s*(g|kg|ml|L|l|oz|lb|lbs)\b/gi, "")
    .replace(/\b\d+\s*(pk|pack|pcs|pieces|count|ct)\b/gi, "")
    .replace(/\b(sz|spf)\s*\d+\b/gi, "")
    .replace(/\b\d+\s*[×x]\s*\d+\b/gi, "")
    .replace(/\b[A-Z]{2,}[\-\d]+[A-Z\d]*\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── slug helper (mirrors seed utils) ─────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ── API helper ────────────────────────────────────────────────────────────────

async function fetchImageUrls(query, count = 4) {
  const url = `${API_BASE}?query=${encodeURIComponent(query)}`;
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.message);

    const links = data.results
      .slice(0, count)
      .map((r) => r.image_link)
      .filter(Boolean);

    // If the search returned fewer than count results, cycle through what we have
    while (links.length < count && links.length > 0) {
      links.push(links[links.length % links.length]);
    }

    return links.length > 0 ? links : null;
  } catch (err) {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Mongoose minimal schemas ──────────────────────────────────────────────────

const CategorySchema = new mongoose.Schema({ image: String }, { strict: false });
const ProductSchema  = new mongoose.Schema({ images: [String] }, { strict: false });

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log("\n📸  Fetching product & category images from randomimageurl.com\n");

  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to MongoDB\n");

  const Category = mongoose.model("Category", CategorySchema, "categories");
  const Product  = mongoose.model("Product",  ProductSchema,  "products");

  let catOk = 0, catFail = 0, prodOk = 0, prodFail = 0;
  const failures = [];

  // ── 1. Categories ───────────────────────────────────────────────────────────
  console.log("── Categories (" + Object.keys(CATEGORY_TERMS).length + ") ──");

  for (const [slug, term] of Object.entries(CATEGORY_TERMS)) {
    process.stdout.write(`  ${slug.padEnd(28)} `);
    const urls = await fetchImageUrls(term, 1);
    if (urls && urls.length > 0) {
      await Category.updateOne({ slug }, { $set: { image: urls[0] } });
      console.log(`✓`);
      catOk++;
    } else {
      console.log(`✗  (no results for "${term}")`);
      failures.push(`category/${slug}`);
      catFail++;
    }
    await sleep(DELAY_MS);
  }

  // ── 2. Products ─────────────────────────────────────────────────────────────
  console.log(`\n── Products (${PRODUCTS.length}) ──`);

  for (const name of PRODUCTS) {
    const slug = toSlug(name);
    const term = getSearchTerm(name);
    process.stdout.write(`  ${name.padEnd(50)} `);

    const urls = await fetchImageUrls(term, 4);
    if (urls && urls.length > 0) {
      await Product.updateOne({ slug }, { $set: { images: urls } });
      console.log(`✓  (${urls.length} images)`);
      prodOk++;
    } else {
      console.log(`✗  (no results for "${term}")`);
      failures.push(`product/${slug}`);
      prodFail++;
    }
    await sleep(DELAY_MS);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────");
  console.log(`Categories : ${catOk} updated, ${catFail} failed`);
  console.log(`Products   : ${prodOk} updated, ${prodFail} failed`);
  console.log(`Total      : ${catOk + prodOk} updated, ${catFail + prodFail} failed`);

  if (failures.length) {
    console.log("\nFailed items:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  await mongoose.disconnect();
  console.log("\n✅  Done.\n");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
