/**
 * scripts/fetch-product-images.mjs
 *
 * Fetches real keyword-based images from loremflickr.com for every category
 * and product, then updates MongoDB.
 *
 * loremflickr.com ?lock=N returns the same stable cached image every time for
 * a given keyword + lock combination — no API key required, no rate limits.
 *
 * Categories → 1 image  (Category.image)
 * Products   → 4 images (Product.images[])
 *
 * Run:
 *   node scripts/fetch-product-images.mjs
 *   npm run fetch-images
 */

import mongoose from "mongoose";

// ── Config ────────────────────────────────────────────────────────────────────

const MONGODB_URI =
  "mongodb+srv://tesco_app_user:gBybu2tWLja2Y3zA@cluster0.gis5coo.mongodb.net/tesco-grocery?retryWrites=true&w=majority&appName=Cluster0";

const FLICKR_BASE = "https://loremflickr.com";
const DELAY_MS    = 120; // ms between API calls — loremflickr has no published limit

// ── Category keywords ─────────────────────────────────────────────────────────
// Each value is a comma-separated loremflickr keyword string

const CATEGORY_KEYWORDS = {
  "fresh-food":           "vegetables,fruit",
  "bakery":               "bread,bakery",
  "frozen-food":          "frozen,food",
  "treats-snacks":        "chocolate,snacks",
  "food-cupboard":        "pantry,food",
  "drinks":               "drinks,beverages",
  "health-beauty":        "beauty,skincare",
  "household":            "cleaning,household",
  "baby-toddler":         "baby,nursery",
  "pets":                 "dog,cat",
  "home-furniture":       "furniture,interior",
  "electronics-gaming":   "electronics,technology",
  "clothing-accessories": "fashion,clothing",
  "toys-games":           "toys,games",
  "sports-leisure":       "sports,fitness",
  "garden-diy-car":       "garden,plants",
  "hobbies-stationery":   "art,craft",
  "parties-seasonal":     "party,celebration",
  "marketplace":          "shopping,market",
  "kiosk":                "gift,voucher",
  "inspiration-events":   "lifestyle,events",
};

// ── Product keywords ──────────────────────────────────────────────────────────

const PRODUCT_KEYWORDS = {
  // Fresh Food
  "organic-whole-milk-2l":            "milk,dairy",
  "free-range-large-eggs-6pk":        "eggs,chicken",
  "baby-spinach-leaves-200g":         "spinach,salad",
  "cherry-tomatoes-250g":             "tomatoes,red",
  "british-chicken-breast-fillets":   "chicken,meat",
  "scottish-salmon-fillet-240g":      "salmon,fish",
  "greek-style-yogurt-500g":          "yogurt,dairy",
  "unsalted-butter-250g":             "butter,dairy",
  "mature-cheddar-cheese-400g":       "cheese,cheddar",
  "ripe-avocados-2pk":                "avocado,green",
  "braeburn-apples-6pk":              "apples,fruit",
  "chantenay-carrots-500g":           "carrots,vegetable",
  "chestnut-mushrooms-250g":          "mushrooms,fungi",
  "tenderstem-broccoli-200g":         "broccoli,vegetable",
  "british-strawberries-400g":        "strawberries,berries",
  "full-fat-cream-cheese-200g":       "cream,cheese",
  "soured-cream-300ml":               "cream,dairy",
  "british-beef-mince-500g":          "beef,meat",
  "pork-sausages-8pk":                "sausages,pork",
  "smoked-back-bacon-300g":           "bacon,breakfast",
  "whole-british-chicken-16kg":       "chicken,roast",
  "lamb-shoulder-joint-800g":         "lamb,meat",
  "king-prawns-raw-200g":             "prawns,seafood",
  "vine-tomatoes-500g":               "tomatoes,vegetable",
  "new-potatoes-1kg":                 "potatoes,vegetable",
  // Bakery
  "sourdough-bloomer-loaf-800g":      "sourdough,bread",
  "butter-croissants-4pk":            "croissants,pastry",
  "cinnamon-danish-whirls-4pk":       "danish,pastry",
  "seeded-batch-bread-800g":          "bread,seeded",
  "white-tiger-loaf-800g":            "bread,white",
  "blueberry-muffins-4pk":            "muffins,blueberry",
  "pain-au-chocolat-6pk":             "chocolate,croissant",
  "iced-finger-buns-4pk":             "buns,bakery",
  "brioche-burger-buns-4pk":          "brioche,bread",
  "victoria-sponge-cake-420g":        "cake,sponge",
  // Frozen Food
  "birds-eye-fish-fingers-30pk":      "fish,food",
  "chicken-tikka-masala-meal-400g":   "curry,chicken",
  "beef-lasagne-ready-meal-400g":     "lasagne,pasta",
  "garden-peas-1kg":                  "peas,green",
  "sweetcorn-kernels-1kg":            "sweetcorn,yellow",
  "chocolate-ice-cream-tub-1l":       "icecream,chocolate",
  "quorn-mince-500g":                 "vegetarian,food",
  "margherita-stone-baked-pizza":     "pizza,margherita",
  "fish-chips-meal-for-2":            "fish,chips",
  "sausage-rolls-12pk":               "sausage,pastry",
  "crispy-potato-waffles-10pk":       "potato,waffles",
  "straight-cut-frozen-chips-2kg":    "chips,fries",
  // Treats & Snacks
  "ready-salted-crisps-multipack":    "crisps,snacks",
  "cadbury-dairy-milk-200g":          "chocolate,bar",
  "digestive-biscuits-400g":          "biscuits,cookies",
  "pringles-original-200g":           "crisps,tube",
  "haribo-starmix-200g":              "sweets,gummy",
  "milk-tray-chocolates-360g":        "chocolates,box",
  "hobnobs-original-300g":            "biscuits,oat",
  "kitkat-4-finger-4pk":              "chocolate,wafer",
  "oreos-original-154g":              "cookies,biscuits",
  "peanut-mms-190g":                  "chocolate,peanut",
  "doritos-chilli-heatwave-180g":     "crisps,tortilla",
  "jelly-babies-original-190g":       "sweets,candy",
  "fruit-nut-chocolate-200g":         "chocolate,nuts",
  "bourbon-cream-biscuits-300g":      "biscuits,chocolate",
  "twiglets-wheat-sticks-150g":       "snacks,wheat",
  // Food Cupboard
  "heinz-baked-beans-4pk-415g":       "beans,canned",
  "tilda-basmati-rice-2kg":           "rice,basmati",
  "barilla-penne-pasta-500g":         "pasta,penne",
  "heinz-tomato-ketchup-570g":        "ketchup,sauce",
  "extra-virgin-olive-oil-500ml":     "olive,oil",
  "kelloggs-cornflakes-500g":         "cereal,cornflakes",
  "meridian-smooth-peanut-butter":    "peanut,butter",
  "nescafe-original-coffee-200g":     "coffee,jar",
  "pg-tips-80-pyramid-teabags":       "tea,teabags",
  "heinz-tomato-soup-4pk-400g":       "tomato,soup",
  "john-west-tuna-chunks-4pk":        "tuna,fish",
  "blue-dragon-coconut-milk-400ml":   "coconut,milk",
  "kikkoman-dark-soy-sauce-150ml":    "soy,sauce",
  "knorr-beef-stock-cubes-8pk":       "stock,cooking",
  "pataks-mango-chutney-360g":        "mango,chutney",
  "red-lentils-500g":                 "lentils,red",
  "plain-white-flour-15kg":           "flour,baking",
  "golden-caster-sugar-1kg":          "sugar,baking",
  "quaker-oat-so-simple-oats-1kg":    "oats,porridge",
  "dolmio-bolognese-sauce-500g":      "pasta,sauce",
  // Drinks
  "tropicana-orange-juice-1l":        "orange,juice",
  "coca-cola-original-6pk-cans":      "cola,drinks",
  "buxton-still-water-12pk-500ml":    "water,bottle",
  "oatly-barista-oat-drink-1l":       "oat,milk",
  "clipper-organic-green-tea-20pk":   "green,tea",
  "ribena-blackcurrant-drink-1l":     "blackcurrant,drink",
  "guinness-draught-4pk-cans":        "beer,dark",
  "blossom-hill-rose-wine-75cl":      "wine,rose",
  "kopparberg-mixed-fruit-cider-4pk": "cider,apple",
  "red-bull-energy-drink-4pk":        "energy,drink",
  "vita-coco-coconut-water-1l":       "coconut,water",
  "belvoir-elderflower-cordial-500ml":"elderflower,drink",
  "fever-tree-tonic-water-8pk":       "tonic,water",
  "alpro-almond-milk-original-1l":    "almond,milk",
  "gts-kombucha-ginger-lemon-330ml":  "kombucha,fermented",
  // Health & Beauty
  "head-and-shoulders-classic-shampoo":"shampoo,hair",
  "dove-body-wash-original-250ml":    "shower,gel",
  "simple-moisturiser-spf15-125ml":   "moisturiser,skincare",
  "colgate-max-white-toothpaste-75ml":"toothpaste,teeth",
  "always-ultra-normal-pads-14pk":    "feminine,hygiene",
  "radox-muscle-soak-bath-salts-900g":"bath,salts",
  "nurofen-express-200mg-tablets-16pk":"medicine,tablets",
  "vitamin-c-1000mg-tablets-60pk":    "vitamins,supplement",
  "loreal-elvive-conditioner-400ml":  "conditioner,hair",
  "gillette-fusion5-blades-4pk":      "razor,shaving",
  "maybelline-fit-me-foundation-120": "foundation,makeup",
  "cerave-moisturising-cream-177ml":  "cream,skincare",
  // Household
  "fairy-original-washing-up-liquid": "washing,soap",
  "ariel-3-in-1-pods-30pk":           "laundry,washing",
  "andrex-classic-white-rolls-9pk":   "toilet,paper",
  "domestos-original-thick-bleach":   "bleach,cleaning",
  "flash-multi-surface-spray-800ml":  "cleaning,spray",
  "vileda-supermocio-mop-bucket":     "mop,cleaning",
  "plenty-kitchen-roll-2pk":          "kitchen,paper",
  "dettol-antibacterial-wipes-84pk":  "wipes,antibacterial",
  "febreze-fabric-freshener-300ml":   "freshener,spray",
  "ecover-washing-up-liquid-1l":      "eco,washing",
  // Baby & Toddler
  "pampers-active-fit-nappies-sz4-46pk":"baby,nappy",
  "aptamil-first-infant-milk-800g":   "baby,formula",
  "ellas-kitchen-organic-pouches-8pk":"baby,food",
  "sudocrem-healing-cream-250g":      "baby,cream",
  "huggies-pure-baby-wipes-12pk":     "baby,wipes",
  "calpol-infant-suspension-100ml":   "medicine,baby",
  "johnsons-baby-top-to-toe-bath":    "baby,bath",
  "mam-anti-colic-bottle-260ml":      "bottle,baby",
  // Pets
  "whiskas-cat-pouches-in-gravy-12pk":"cat,food",
  "pedigree-adult-dry-dog-food-3kg":  "dog,food",
  "royal-canin-indoor-cat-food-2kg":  "cat,premium",
  "dreamies-cat-treats-chicken-60g":  "cat,treats",
  "dentastix-medium-dog-treats-7pk":  "dog,treats",
  "ferplast-hamster-cage-cubo":       "hamster,cage",
  "tetra-goldfish-flake-food-52g":    "goldfish,aquarium",
  "kong-cat-catnip-toy":              "cat,toy",
  // Home & Furniture
  "microfibre-duvet-cover-set-king":  "bedding,duvet",
  "cerastone-non-stick-frying-pan-28cm":"frying,pan",
  "kilner-clip-top-glass-jars-4pk":   "glass,jar",
  "led-fairy-lights-20m-warm-white":  "fairy,lights",
  "silentnight-healthy-fill-pillow-2pk":"pillow,bedroom",
  "bamboo-cutting-board-large":       "cutting,board",
  "yankee-candle-vanilla-cupcake-lg": "candle,scented",
  "robert-welch-kitchen-knife-block": "knife,kitchen",
  // Electronics & Gaming
  "anker-usb-c-charging-cable-2m":    "cable,usb",
  "sony-wh-1000xm5-headphones":       "headphones,wireless",
  "tp-link-smart-plug-4pk":           "smart,plug",
  "xbox-wireless-controller":         "gaming,controller",
  "belkin-hdmi-21-cable-2m":          "hdmi,cable",
  "anker-powercore-10000mah-bank":    "powerbank,charger",
  "philips-hue-white-smart-bulbs-3pk":"smart,bulb",
  "duracell-optimum-aa-batteries-16pk":"batteries,aa",
  "nintendo-switch-carrying-case":    "nintendo,gaming",
  "elgato-ring-light-10-inch":        "ring,light",
  // Clothing & Accessories
  "classic-white-crew-neck-t-shirt":  "tshirt,white",
  "slim-fit-stretch-jeans-black":     "jeans,denim",
  "cotton-ankle-socks-5pk-black":     "socks,cotton",
  "natural-canvas-tote-bag":          "tote,bag",
  "lightweight-waterproof-rain-mac":  "jacket,waterproof",
  "ribbed-knit-beanie-hat-navy":      "beanie,hat",
  "polaroid-sunglasses-uv400":        "sunglasses,fashion",
  "rfid-leather-bifold-wallet-brown": "wallet,leather",
  // Toys & Games
  "lego-classic-creative-bricks-790": "lego,bricks",
  "hasbro-monopoly-classic-edition":  "monopoly,game",
  "play-doh-super-colour-kit-20pk":   "playdoh,clay",
  "ravensburger-1000pcs-jigsaw":      "jigsaw,puzzle",
  "rubiks-cube-3x3-original":         "rubik,cube",
  "orchard-toys-shopping-list-game":  "children,game",
  "uno-ultimate-card-game":           "cards,game",
  "schleich-farm-animal-figure-set":  "animals,toys",
  // Sports & Leisure
  "gaiam-yoga-mat-6mm-non-slip":      "yoga,mat",
  "resistance-bands-set-5-levels":    "resistance,bands",
  "adjustable-dumbbell-10kg":         "dumbbell,weights",
  "camelbak-chute-mag-bottle-1l":     "water,bottle",
  "running-phone-armband-iphone":     "running,phone",
  "speed-jump-rope-adjustable":       "jump,rope",
  "triggerpoint-grid-foam-roller":    "foam,roller",
  "speedo-biofuse-20-swim-goggles":   "swimming,goggles",
  // Garden DIY & Car
  "miracle-gro-liquid-plant-food-1l": "plants,garden",
  "haws-traditional-watering-can-10l":"watering,can",
  "spear-jackson-stainless-trowel":   "trowel,garden",
  "febreze-car-air-freshener-2pk":    "car,freshener",
  "wd-40-multi-use-spray-450ml":      "spray,lubricant",
  "roundup-weedkiller-ready-to-use":  "weedkiller,garden",
  // Hobbies & Stationery
  "winsor-newton-watercolours-24":    "watercolour,art",
  "paper-mate-ballpoint-pens-24pk":   "pens,stationery",
  "fiskars-kids-craft-scissors-3pk":  "scissors,craft",
  "post-it-notes-value-pack-12-pad":  "sticky,notes",
  "enchanted-forest-colouring-book":  "colouring,book",
  // Parties & Seasonal
  "birthday-balloons-30pk-assorted":  "balloons,birthday",
  "biodegradable-party-plates-20pk":  "party,plates",
  "ikea-glimma-tealights-100pk":      "candles,tealights",
  "luxury-gift-wrap-paper-4-sheets":  "gift,wrapping",
  "christmas-gold-tinsel-5m-4pk":     "christmas,tinsel",
  // Marketplace
  "optimum-nutrition-gold-standard-whey-vanilla-1kg": "protein,powder",
  "seven-seas-omega-3-fish-oil-120pk":"omega,supplement",
  "himalayan-pink-salt-fine-500g":    "salt,pink",
  "nescafe-dolce-gusto-cappuccino-16pk":"cappuccino,coffee",
  "rowse-pure-natural-clear-honey":   "honey,jar",
  // Kiosk
  "amazon-gift-card-25":              "gift,card",
  "netflix-1-month-gift-card":        "streaming,gift",
  "google-play-gift-card-10":         "digital,card",
  // Inspiration & Events
  "prakash-summer-bbq-bundle":        "barbecue,summer",
  "ramadan-essentials-hamper":        "food,hamper",
  "christmas-party-starter-kit":      "christmas,party",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

/**
 * Fetch the final resolved URL from loremflickr for a keyword+lock combo.
 * loremflickr always redirects to the same cached Flickr image for a given
 * keyword+lock, making it a stable, repeatable URL.
 */
async function resolveFlickrUrl(keywords, width, height, lock) {
  const url = `${FLICKR_BASE}/${width}/${height}/${keywords}?lock=${lock}`;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.url; // final resolved URL after redirect
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Mongoose minimal schemas ──────────────────────────────────────────────────

const CategorySchema = new mongoose.Schema({ image: String }, { strict: false });
const ProductSchema  = new mongoose.Schema({ images: [String] }, { strict: false });

// ── Product list (all 204) ────────────────────────────────────────────────────

const PRODUCTS = [
  // Fresh Food (25)
  "Organic Whole Milk 2L", "Free Range Large Eggs 6pk", "Baby Spinach Leaves 200g",
  "Cherry Tomatoes 250g", "British Chicken Breast Fillets", "Scottish Salmon Fillet 240g",
  "Greek Style Yogurt 500g", "Unsalted Butter 250g", "Mature Cheddar Cheese 400g",
  "Ripe Avocados 2pk", "Braeburn Apples 6pk", "Chantenay Carrots 500g",
  "Chestnut Mushrooms 250g", "Tenderstem Broccoli 200g", "British Strawberries 400g",
  "Full Fat Cream Cheese 200g", "Soured Cream 300ml", "British Beef Mince 500g",
  "Pork Sausages 8pk", "Smoked Back Bacon 300g", "Whole British Chicken 1.6kg",
  "Lamb Shoulder Joint 800g", "King Prawns Raw 200g", "Vine Tomatoes 500g",
  "New Potatoes 1kg",
  // Bakery (10)
  "Sourdough Bloomer Loaf 800g", "Butter Croissants 4pk", "Cinnamon Danish Whirls 4pk",
  "Seeded Batch Bread 800g", "White Tiger Loaf 800g", "Blueberry Muffins 4pk",
  "Pain au Chocolat 6pk", "Iced Finger Buns 4pk", "Brioche Burger Buns 4pk",
  "Victoria Sponge Cake 420g",
  // Frozen Food (12)
  "Birds Eye Fish Fingers 30pk", "Chicken Tikka Masala Meal 400g",
  "Beef Lasagne Ready Meal 400g", "Garden Peas 1kg", "Sweetcorn Kernels 1kg",
  "Chocolate Ice Cream Tub 1L", "Quorn Mince 500g", "Margherita Stone Baked Pizza",
  "Fish & Chips Meal for 2", "Sausage Rolls 12pk", "Crispy Potato Waffles 10pk",
  "Straight Cut Frozen Chips 2kg",
  // Treats & Snacks (15)
  "Ready Salted Crisps Multipack", "Cadbury Dairy Milk 200g", "Digestive Biscuits 400g",
  "Pringles Original 200g", "Haribo Starmix 200g", "Milk Tray Chocolates 360g",
  "Hobnobs Original 300g", "KitKat 4-Finger 4pk", "Oreos Original 154g",
  "Peanut MMs 190g", "Doritos Chilli Heatwave 180g", "Jelly Babies Original 190g",
  "Fruit & Nut Chocolate 200g", "Bourbon Cream Biscuits 300g", "Twiglets Wheat Sticks 150g",
  // Food Cupboard (20)
  "Heinz Baked Beans 4pk 415g", "Tilda Basmati Rice 2kg", "Barilla Penne Pasta 500g",
  "Heinz Tomato Ketchup 570g", "Extra Virgin Olive Oil 500ml", "Kelloggs Cornflakes 500g",
  "Meridian Smooth Peanut Butter", "Nescafe Original Coffee 200g",
  "PG Tips 80 Pyramid Teabags", "Heinz Tomato Soup 4pk 400g",
  "John West Tuna Chunks 4pk", "Blue Dragon Coconut Milk 400ml",
  "Kikkoman Dark Soy Sauce 150ml", "Knorr Beef Stock Cubes 8pk",
  "Pataks Mango Chutney 360g", "Red Lentils 500g", "Plain White Flour 1.5kg",
  "Golden Caster Sugar 1kg", "Quaker Oat So Simple Oats 1kg",
  "Dolmio Bolognese Sauce 500g",
  // Drinks (15)
  "Tropicana Orange Juice 1L", "Coca-Cola Original 6pk Cans",
  "Buxton Still Water 12pk 500ml", "Oatly Barista Oat Drink 1L",
  "Clipper Organic Green Tea 20pk", "Ribena Blackcurrant Drink 1L",
  "Guinness Draught 4pk Cans", "Blossom Hill Rose Wine 75cl",
  "Kopparberg Mixed Fruit Cider 4pk", "Red Bull Energy Drink 4pk",
  "Vita Coco Coconut Water 1L", "Belvoir Elderflower Cordial 500ml",
  "Fever-Tree Tonic Water 8pk", "Alpro Almond Milk Original 1L",
  "GTs Kombucha Ginger Lemon 330ml",
  // Health & Beauty (12)
  "Head and Shoulders Classic Shampoo", "Dove Body Wash Original 250ml",
  "Simple Moisturiser SPF15 125ml", "Colgate Max White Toothpaste 75ml",
  "Always Ultra Normal Pads 14pk", "Radox Muscle Soak Bath Salts 900g",
  "Nurofen Express 200mg Tablets 16pk", "Vitamin C 1000mg Tablets 60pk",
  "LOreal Elvive Conditioner 400ml", "Gillette Fusion5 Blades 4pk",
  "Maybelline Fit Me Foundation 120", "CeraVe Moisturising Cream 177ml",
  // Household (10)
  "Fairy Original Washing Up Liquid", "Ariel 3-in-1 Pods 30pk",
  "Andrex Classic White Rolls 9pk", "Domestos Original Thick Bleach",
  "Flash Multi-Surface Spray 800ml", "Vileda SuperMocio Mop & Bucket",
  "Plenty Kitchen Roll 2pk", "Dettol Antibacterial Wipes 84pk",
  "Febreze Fabric Freshener 300ml", "Ecover Washing Up Liquid 1L",
  // Baby & Toddler (8)
  "Pampers Active Fit Nappies Sz4 46pk", "Aptamil First Infant Milk 800g",
  "Ellas Kitchen Organic Pouches 8pk", "Sudocrem Healing Cream 250g",
  "Huggies Pure Baby Wipes 12pk", "Calpol Infant Suspension 100ml",
  "Johnsons Baby Top-to-Toe Bath", "MAM Anti-Colic Bottle 260ml",
  // Pets (8)
  "Whiskas Cat Pouches in Gravy 12pk", "Pedigree Adult Dry Dog Food 3kg",
  "Royal Canin Indoor Cat Food 2kg", "Dreamies Cat Treats Chicken 60g",
  "Dentastix Medium Dog Treats 7pk", "Ferplast Hamster Cage Cubo",
  "Tetra Goldfish Flake Food 52g", "KONG Cat Catnip Toy",
  // Home & Furniture (8)
  "Microfibre Duvet Cover Set King", "Cerastone Non-Stick Frying Pan 28cm",
  "Kilner Clip Top Glass Jars 4pk", "LED Fairy Lights 20m Warm White",
  "Silentnight Healthy Fill Pillow 2pk", "Bamboo Cutting Board Large",
  "Yankee Candle Vanilla Cupcake Lg", "Robert Welch Kitchen Knife Block",
  // Electronics & Gaming (10)
  "Anker USB-C Charging Cable 2m", "Sony WH-1000XM5 Headphones",
  "TP-Link Smart Plug 4pk", "Xbox Wireless Controller",
  "Belkin HDMI 2.1 Cable 2m", "Anker PowerCore 10000mAh Bank",
  "Philips Hue White Smart Bulbs 3pk", "Duracell Optimum AA Batteries 16pk",
  "Nintendo Switch Carrying Case", "Elgato Ring Light 10 Inch",
  // Clothing & Accessories (8)
  "Classic White Crew Neck T-Shirt", "Slim Fit Stretch Jeans Black",
  "Cotton Ankle Socks 5pk Black", "Natural Canvas Tote Bag",
  "Lightweight Waterproof Rain Mac", "Ribbed Knit Beanie Hat Navy",
  "Polaroid Sunglasses UV400", "RFID Leather Bifold Wallet Brown",
  // Toys & Games (8)
  "LEGO Classic Creative Bricks 790", "Hasbro Monopoly Classic Edition",
  "Play-Doh Super Colour Kit 20pk", "Ravensburger 1000pcs Jigsaw",
  "Rubiks Cube 3x3 Original", "Orchard Toys Shopping List Game",
  "Uno Ultimate Card Game", "Schleich Farm Animal Figure Set",
  // Sports & Leisure (8)
  "Gaiam Yoga Mat 6mm Non-Slip", "Resistance Bands Set 5 Levels",
  "Adjustable Dumbbell 10kg", "CamelBak Chute Mag Bottle 1L",
  "Running Phone Armband iPhone", "Speed Jump Rope Adjustable",
  "TriggerPoint GRID Foam Roller", "Speedo Biofuse 2.0 Swim Goggles",
  // Garden DIY & Car (6)
  "Miracle-Gro Liquid Plant Food 1L", "Haws Traditional Watering Can 10L",
  "Spear & Jackson Stainless Trowel", "Febreze Car Air Freshener 2pk",
  "WD-40 Multi-Use Spray 450ml", "Roundup Weedkiller Ready-to-Use",
  // Hobbies & Stationery (5)
  "Winsor & Newton Watercolours 24", "Paper Mate Ballpoint Pens 24pk",
  "Fiskars Kids Craft Scissors 3pk", "Post-it Notes Value Pack 12-pad",
  "Enchanted Forest Colouring Book",
  // Parties & Seasonal (5)
  "Birthday Balloons 30pk Assorted", "Biodegradable Party Plates 20pk",
  "IKEA Glimma Tealights 100pk", "Luxury Gift Wrap Paper 4 Sheets",
  "Christmas Gold Tinsel 5m 4pk",
  // Marketplace (5)
  "Optimum Nutrition Gold Standard Whey Vanilla 1kg",
  "Seven Seas Omega-3 Fish Oil 120pk", "Himalayan Pink Salt Fine 500g",
  "Nescafe Dolce Gusto Cappuccino 16pk", "Rowse Pure Natural Clear Honey",
  // Kiosk (3)
  "Amazon Gift Card 25", "Netflix 1-Month Gift Card", "Google Play Gift Card 10",
  // Inspiration & Events (3)
  "Prakash Summer BBQ Bundle", "Ramadan Essentials Hamper",
  "Christmas Party Starter Kit",
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log("\n📸  Fetching images from loremflickr.com → updating MongoDB\n");

  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to MongoDB\n");

  const Category = mongoose.model("Category", CategorySchema, "categories");
  const Product  = mongoose.model("Product",  ProductSchema,  "products");

  let catOk = 0, catFail = 0, prodOk = 0, prodFail = 0;

  // ── 1. Categories ───────────────────────────────────────────────────────────
  console.log(`── Categories (${Object.keys(CATEGORY_KEYWORDS).length}) ──`);

  for (const [slug, kw] of Object.entries(CATEGORY_KEYWORDS)) {
    process.stdout.write(`  ${slug.padEnd(28)} `);
    const url = await resolveFlickrUrl(kw, 600, 400, slug.length + 7);
    if (url) {
      await Category.updateOne({ slug }, { $set: { image: url } });
      console.log(`✓`);
      catOk++;
    } else {
      console.log(`✗`);
      catFail++;
    }
    await sleep(DELAY_MS);
  }

  // ── 2. Products ─────────────────────────────────────────────────────────────
  console.log(`\n── Products (${PRODUCTS.length}) ──`);

  for (const name of PRODUCTS) {
    const slug = toSlug(name);
    const kw   = PRODUCT_KEYWORDS[slug];

    process.stdout.write(`  ${name.slice(0, 48).padEnd(50)} `);

    if (!kw) {
      console.log(`✗  (no keyword mapping)`);
      prodFail++;
      continue;
    }

    // Fetch 4 images at different lock values — each lock is deterministic
    const baseLock = (slug.length * 3 + 11) % 90 + 1; // unique-ish per product
    const locks = [baseLock, baseLock + 1, baseLock + 2, baseLock + 3];

    const urls = [];
    for (const lock of locks) {
      const url = await resolveFlickrUrl(kw, 800, 800, lock);
      if (url) urls.push(url);
      await sleep(DELAY_MS);
    }

    if (urls.length > 0) {
      // Pad to 4 if fewer resolved
      while (urls.length < 4) urls.push(urls[urls.length - 1]);
      await Product.updateOne({ slug }, { $set: { images: urls } });
      console.log(`✓  (${urls.length} images)`);
      prodOk++;
    } else {
      console.log(`✗  (all requests failed)`);
      prodFail++;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────");
  console.log(`Categories : ${catOk} updated, ${catFail} failed`);
  console.log(`Products   : ${prodOk} updated, ${prodFail} failed`);
  console.log(`Total      : ${catOk + prodOk} updated, ${catFail + prodFail} failed`);

  await mongoose.disconnect();
  console.log("\n✅  Done.\n");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
