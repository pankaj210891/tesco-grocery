/**
 * Full 3-level category hierarchy for all 21 root categories.
 * Each root has exactly 5 level-1 subcategories, each with 5 level-2 children.
 *
 * Exports: FULL_TREE, seedCategories()
 */

import mongoose from "mongoose";
import { connectDB } from "../../src/lib/db/mongoose";
import CategoryModel from "../../src/lib/db/models/category.model";
import { CATEGORY_SEEDS } from "../../src/lib/data/seeds/categories.seed";
import { toSlug } from "./helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

type L2Def = [string, string]; // [name, emoji]
type L1Def = { name: string; emoji: string; children: L2Def[] };
export type L0Entry = { slug: string; name: string; children: L1Def[] };

// ─── Colour palette (inherited from root category) ────────────────────────────

export const ROOT_COLORS: Record<string, { color: string; textColor: string }> = {
  "fresh-food":           { color: "bg-green-50",   textColor: "text-green-700"   },
  "bakery":               { color: "bg-amber-50",   textColor: "text-amber-700"   },
  "frozen-food":          { color: "bg-cyan-50",    textColor: "text-cyan-700"    },
  "treats-snacks":        { color: "bg-orange-50",  textColor: "text-orange-700"  },
  "food-cupboard":        { color: "bg-yellow-50",  textColor: "text-yellow-700"  },
  "drinks":               { color: "bg-purple-50",  textColor: "text-purple-700"  },
  "health-beauty":        { color: "bg-fuchsia-50", textColor: "text-fuchsia-700" },
  "household":            { color: "bg-gray-50",    textColor: "text-gray-700"    },
  "baby-toddler":         { color: "bg-pink-50",    textColor: "text-pink-700"    },
  "pets":                 { color: "bg-lime-50",    textColor: "text-lime-700"    },
  "home-furniture":       { color: "bg-stone-50",   textColor: "text-stone-700"   },
  "electronics-gaming":   { color: "bg-blue-50",    textColor: "text-blue-700"    },
  "clothing-accessories": { color: "bg-rose-50",    textColor: "text-rose-700"    },
  "toys-games":           { color: "bg-red-50",     textColor: "text-red-700"     },
  "sports-leisure":       { color: "bg-indigo-50",  textColor: "text-indigo-700"  },
  "garden-diy-car":       { color: "bg-green-50",   textColor: "text-green-800"   },
  "hobbies-stationery":   { color: "bg-emerald-50", textColor: "text-emerald-700" },
  "parties-seasonal":     { color: "bg-teal-50",    textColor: "text-teal-700"    },
  "marketplace":          { color: "bg-violet-50",  textColor: "text-violet-700"  },
  "kiosk":                { color: "bg-sky-50",     textColor: "text-sky-700"     },
  "inspiration-events":   { color: "bg-yellow-50",  textColor: "text-yellow-800"  },
};

// ─── Full 3-level category tree ───────────────────────────────────────────────

export const FULL_TREE: L0Entry[] = [
  {
    slug: "fresh-food", name: "Fresh Food",
    children: [
      { name: "Vegetables", emoji: "🥕", children: [
        ["Salad & Leaves", "🥗"], ["Root Vegetables", "🥔"],
        ["Brassicas & Greens", "🥦"], ["Fresh Herbs", "🌿"], ["Mushrooms", "🍄"],
      ]},
      { name: "Fruits", emoji: "🍎", children: [
        ["Berries", "🍓"], ["Citrus Fruits", "🍊"],
        ["Tropical Fruits", "🥭"], ["Stone Fruits", "🍑"], ["Apples & Pears", "🍏"],
      ]},
      { name: "Dairy & Eggs", emoji: "🥛", children: [
        ["Fresh Milk", "🥛"], ["Cheese", "🧀"],
        ["Yoghurt", "🍦"], ["Butter & Cream", "🧈"], ["Eggs", "🥚"],
      ]},
      { name: "Meat & Poultry", emoji: "🍖", children: [
        ["Chicken & Turkey", "🍗"], ["Beef & Steak", "🥩"],
        ["Pork & Bacon", "🥓"], ["Lamb", "🍖"], ["Sausages & Burgers", "🌭"],
      ]},
      { name: "Fish & Seafood", emoji: "🐟", children: [
        ["Salmon & Trout", "🐟"], ["White Fish", "🐠"],
        ["Shellfish & Prawns", "🦐"], ["Smoked Fish", "🐡"], ["Ready-to-Cook Fish", "🍣"],
      ]},
    ],
  },
  {
    slug: "bakery", name: "Bakery",
    children: [
      { name: "Breads & Loaves", emoji: "🍞", children: [
        ["White Bread", "🍞"], ["Wholemeal Bread", "🌾"],
        ["Sourdough", "🥖"], ["Speciality Bread", "🫓"], ["Seeded Bread", "🌱"],
      ]},
      { name: "Rolls & Buns", emoji: "🥐", children: [
        ["White Rolls", "🍞"], ["Brioche Buns", "🧁"],
        ["Burger Buns", "🍔"], ["Sandwich Thins", "🥪"], ["Mini Rolls", "🎂"],
      ]},
      { name: "Cakes & Desserts", emoji: "🎂", children: [
        ["Layer Cakes", "🎂"], ["Sponge Cakes", "🎂"],
        ["Cheesecakes", "🍰"], ["Tarts & Flans", "🥧"], ["Cupcakes", "🧁"],
      ]},
      { name: "Pastries", emoji: "🥐", children: [
        ["Croissants", "🥐"], ["Danish Pastries", "🥐"],
        ["Pain au Chocolat", "🍫"], ["Muffins", "🧁"], ["Scones", "🫓"],
      ]},
      { name: "Free-From Bakery", emoji: "🌿", children: [
        ["Gluten-Free Bread", "🍞"], ["Vegan Cakes", "🌱"],
        ["Dairy-Free Pastries", "🥐"], ["Keto Bread", "🫓"], ["Sugar-Free Bakes", "🎂"],
      ]},
    ],
  },
  {
    slug: "frozen-food", name: "Frozen Food",
    children: [
      { name: "Frozen Meals", emoji: "🍱", children: [
        ["Ready Meals", "🍱"], ["Frozen Pizza", "🍕"],
        ["Pies & Pastries", "🥧"], ["Frozen Curries", "🍛"], ["Pasta Dishes", "🍝"],
      ]},
      { name: "Frozen Vegetables", emoji: "🥦", children: [
        ["Mixed Vegetables", "🥦"], ["Peas & Sweetcorn", "🌽"],
        ["Frozen Spinach", "🥬"], ["Edamame & Beans", "🫘"], ["Roasting Veg", "🥕"],
      ]},
      { name: "Ice Cream & Desserts", emoji: "🍦", children: [
        ["Ice Cream Tubs", "🍦"], ["Ice Lollies", "🍭"],
        ["Frozen Yoghurt", "🍦"], ["Profiteroles", "🍮"], ["Frozen Cheesecake", "🍰"],
      ]},
      { name: "Frozen Meat & Fish", emoji: "🍗", children: [
        ["Frozen Chicken", "🍗"], ["Beef Burgers", "🍔"],
        ["Frozen Fish Fillets", "🐟"], ["King Prawns", "🦐"], ["Meatballs", "🍖"],
      ]},
      { name: "Frozen Snacks", emoji: "🍟", children: [
        ["Oven Chips & Fries", "🍟"], ["Chicken Nuggets", "🍗"],
        ["Onion Rings", "🧅"], ["Spring Rolls", "🥢"], ["Waffles & Pancakes", "🧇"],
      ]},
    ],
  },
  {
    slug: "treats-snacks", name: "Treats & Snacks",
    children: [
      { name: "Crisps & Popcorn", emoji: "🍿", children: [
        ["Classic Crisps", "🍟"], ["Sharing Crisps", "🍟"],
        ["Popcorn", "🍿"], ["Pretzels", "🥨"], ["Rice Cakes", "🍙"],
      ]},
      { name: "Chocolate", emoji: "🍫", children: [
        ["Milk Chocolate", "🍫"], ["Dark Chocolate", "🍫"],
        ["White Chocolate", "🍫"], ["Chocolate Bars", "🍫"], ["Chocolate Gifts", "🎁"],
      ]},
      { name: "Sweets & Candy", emoji: "🍬", children: [
        ["Gummies & Jelly", "🍬"], ["Lollipops", "🍭"],
        ["Mints & Gum", "🌿"], ["Fizzy Sweets", "🍬"], ["Liquorice", "🖤"],
      ]},
      { name: "Biscuits & Crackers", emoji: "🍪", children: [
        ["Chocolate Biscuits", "🍫"], ["Digestives & Rich Tea", "🍪"],
        ["Cookies", "🍪"], ["Savoury Crackers", "🧇"], ["Wafers", "🍪"],
      ]},
      { name: "Healthy Snacks", emoji: "🥜", children: [
        ["Protein Bars", "💪"], ["Nut Bars", "🥜"],
        ["Fruit Snacks", "🍎"], ["Granola Bars", "🌾"], ["Trail Mix", "🥜"],
      ]},
    ],
  },
  {
    slug: "food-cupboard", name: "Food Cupboard",
    children: [
      { name: "Pasta, Rice & Grains", emoji: "🌾", children: [
        ["Dried Pasta", "🍝"], ["Basmati Rice", "🍚"],
        ["Long Grain Rice", "🍚"], ["Noodles", "🍜"], ["Quinoa & Couscous", "🌾"],
      ]},
      { name: "Tinned & Canned Goods", emoji: "🥫", children: [
        ["Tinned Tomatoes", "🍅"], ["Baked Beans", "🫘"],
        ["Tinned Fish", "🐟"], ["Tinned Soup", "🥣"], ["Chickpeas & Pulses", "🫘"],
      ]},
      { name: "Sauces & Condiments", emoji: "🫙", children: [
        ["Pasta Sauces", "🍅"], ["Ketchup & Brown Sauce", "🫙"],
        ["Mayonnaise & Salad Cream", "🥗"], ["Soy & Asian Sauces", "🥢"], ["Hot Sauce & Chillies", "🌶️"],
      ]},
      { name: "Oils & Vinegars", emoji: "🫒", children: [
        ["Olive Oil", "🫒"], ["Vegetable Oil", "🫙"],
        ["Coconut Oil", "🥥"], ["Balsamic Vinegar", "🍷"], ["Apple Cider Vinegar", "🍎"],
      ]},
      { name: "Baking Essentials", emoji: "🧁", children: [
        ["Flour", "🌾"], ["Sugar & Sweeteners", "🍬"],
        ["Baking Powder & Soda", "🧁"], ["Chocolate Chips", "🍫"], ["Vanilla & Extracts", "🫙"],
      ]},
    ],
  },
  {
    slug: "drinks", name: "Drinks",
    children: [
      { name: "Soft Drinks", emoji: "🥤", children: [
        ["Cola & Fizzy Drinks", "🥤"], ["Lemonade & Mixers", "🍋"],
        ["Energy Drinks", "⚡"], ["Flavoured Water", "💧"], ["Squash & Cordials", "🍹"],
      ]},
      { name: "Water", emoji: "💧", children: [
        ["Still Water", "💧"], ["Sparkling Water", "🫧"],
        ["Mineral Water", "💎"], ["Infused Water", "🌿"], ["Electrolyte Water", "⚡"],
      ]},
      { name: "Tea & Coffee", emoji: "☕", children: [
        ["Black Tea", "🍵"], ["Herbal & Fruit Tea", "🌿"],
        ["Ground Coffee", "☕"], ["Instant Coffee", "☕"], ["Coffee Pods", "☕"],
      ]},
      { name: "Juices & Smoothies", emoji: "🧃", children: [
        ["Orange Juice", "🍊"], ["Apple & Pear Juice", "🍏"],
        ["Tropical Juice", "🥭"], ["Smoothies", "🫐"], ["Vegetable Juice", "🥕"],
      ]},
      { name: "Alcohol-Free", emoji: "🍺", children: [
        ["AF Beer & Lager", "🍺"], ["AF Wine", "🍷"],
        ["Kombucha & Kefir", "🍵"], ["AF Cocktails", "🍸"], ["Tonics & Bitters", "🫙"],
      ]},
    ],
  },
  {
    slug: "health-beauty", name: "Health & Beauty",
    children: [
      { name: "Skincare", emoji: "✨", children: [
        ["Moisturisers", "💆"], ["Face Wash & Cleansers", "🧼"],
        ["Serums & Treatments", "✨"], ["Eye Cream", "👁️"], ["SPF Sunscreen", "☀️"],
      ]},
      { name: "Haircare", emoji: "💇", children: [
        ["Shampoo", "🚿"], ["Conditioner", "💆"],
        ["Hair Masks & Treatments", "💆"], ["Dry Shampoo", "🧴"], ["Hair Styling", "💈"],
      ]},
      { name: "Vitamins & Supplements", emoji: "💊", children: [
        ["Multivitamins", "💊"], ["Vitamin D & C", "💊"],
        ["Omega-3 & Fish Oils", "🐟"], ["Probiotics", "🦠"], ["Collagen Supplements", "✨"],
      ]},
      { name: "Medicines & First Aid", emoji: "💉", children: [
        ["Pain Relief", "💊"], ["Cold & Flu Remedies", "🤧"],
        ["Digestion & Gut Health", "🫘"], ["Plasters & Bandages", "🩹"], ["Antiseptics & Sanitisers", "🧴"],
      ]},
      { name: "Personal Hygiene", emoji: "🧼", children: [
        ["Shower Gel & Body Wash", "🚿"], ["Deodorant", "🌸"],
        ["Toothpaste & Toothbrushes", "🦷"], ["Mouthwash", "🫧"], ["Feminine Care", "🌸"],
      ]},
    ],
  },
  {
    slug: "household", name: "Household",
    children: [
      { name: "Cleaning Products", emoji: "🧹", children: [
        ["Multi-Surface Cleaners", "🧹"], ["Kitchen Cleaners", "🍳"],
        ["Bathroom Cleaners", "🚿"], ["Floor Cleaners", "🧺"], ["Glass & Window Cleaners", "🪟"],
      ]},
      { name: "Laundry", emoji: "👕", children: [
        ["Washing Powder", "👕"], ["Liquid Detergent", "🧴"],
        ["Fabric Softener", "🌸"], ["Stain Removers", "🫧"], ["Laundry Capsules", "💊"],
      ]},
      { name: "Kitchen Essentials", emoji: "🍳", children: [
        ["Foil & Clingfilm", "🥗"], ["Baking Paper", "🧁"],
        ["Food Bags & Wrap", "🛍️"], ["Cleaning Cloths & Sponges", "🧽"], ["Washing Up Liquid", "🫧"],
      ]},
      { name: "Paper & Tissues", emoji: "🧻", children: [
        ["Toilet Roll", "🧻"], ["Kitchen Roll", "🧻"],
        ["Facial Tissues", "🤧"], ["Napkins", "🍽️"], ["Baby Wipes", "🧴"],
      ]},
      { name: "Air Care & Bins", emoji: "🌸", children: [
        ["Air Freshener Sprays", "🌸"], ["Plug-In Fresheners", "🔌"],
        ["Reed Diffusers", "🌿"], ["Scented Candles", "🕯️"], ["Bin Bags & Liners", "🗑️"],
      ]},
    ],
  },
  {
    slug: "baby-toddler", name: "Baby & Toddler",
    children: [
      { name: "Baby Food", emoji: "🍼", children: [
        ["Stage 1 Purees", "🥣"], ["Stage 2 Meals", "🍽️"],
        ["Baby Finger Foods", "🥕"], ["Baby Snacks & Puffs", "🫐"], ["Baby Cereals", "🌾"],
      ]},
      { name: "Nappies & Wipes", emoji: "👶", children: [
        ["Newborn Nappies", "👶"], ["Toddler Nappies", "👦"],
        ["Night Nappies", "🌙"], ["Baby Wipes", "🧴"], ["Nappy Bags", "🛍️"],
      ]},
      { name: "Baby Health & Skincare", emoji: "🧴", children: [
        ["Baby Lotion & Oil", "🧴"], ["Nappy Cream", "👶"],
        ["Baby Bath & Wash", "🛁"], ["Baby Shampoo", "🚿"], ["Baby Sun Care", "☀️"],
      ]},
      { name: "Feeding & Nursing", emoji: "🍼", children: [
        ["Baby Bottles", "🍼"], ["Formula Milk", "🥛"],
        ["Sippy Cups & Beakers", "🥤"], ["Sterilisers & Pumps", "🍼"], ["Bibs & Accessories", "🥄"],
      ]},
      { name: "Baby Clothing", emoji: "👶", children: [
        ["Babygrows & Sleepsuits", "💤"], ["Baby Bodysuits", "👶"],
        ["Baby Socks & Hats", "🧦"], ["Scratch Mitts & Bibs", "🤲"], ["Pram Blankets", "🌸"],
      ]},
    ],
  },
  {
    slug: "pets", name: "Pets",
    children: [
      { name: "Dog", emoji: "🐕", children: [
        ["Dry Dog Food", "🦴"], ["Wet Dog Food", "🥩"],
        ["Dog Treats", "🎁"], ["Dog Toys", "🎾"], ["Dog Grooming", "🛁"],
      ]},
      { name: "Cat", emoji: "🐈", children: [
        ["Dry Cat Food", "🐟"], ["Wet Cat Food", "🥩"],
        ["Cat Treats", "🎁"], ["Cat Litter", "🏠"], ["Cat Toys & Accessories", "🎮"],
      ]},
      { name: "Small Animals", emoji: "🐹", children: [
        ["Rabbit Food", "🥕"], ["Guinea Pig & Hamster Food", "🌾"],
        ["Small Animal Bedding", "🛏️"], ["Small Animal Treats", "🎁"], ["Small Animal Accessories", "🏠"],
      ]},
      { name: "Fish & Aquatics", emoji: "🐠", children: [
        ["Fish Food", "🐟"], ["Aquarium Plants & Decor", "🌿"],
        ["Water Treatment", "💧"], ["Fish Tanks & Bowls", "🫙"], ["Aquarium Accessories", "⚙️"],
      ]},
      { name: "Bird", emoji: "🐦", children: [
        ["Bird Seed & Food", "🌾"], ["Bird Treats", "🎁"],
        ["Bird Perches & Toys", "🎮"], ["Bird Baths", "🛁"], ["Bird Health", "💊"],
      ]},
    ],
  },
  {
    slug: "home-furniture", name: "Home & Furniture",
    children: [
      { name: "Bedroom", emoji: "🛏️", children: [
        ["Duvets & Pillows", "🛏️"], ["Bed Sheets & Covers", "🛏️"],
        ["Mattress Toppers", "💤"], ["Curtains & Blinds", "🪟"], ["Bedroom Accessories", "🌙"],
      ]},
      { name: "Kitchen & Dining", emoji: "🍳", children: [
        ["Cookware & Bakeware", "🍳"], ["Tableware & Dinnerware", "🍽️"],
        ["Cutlery & Utensils", "🍴"], ["Kitchen Gadgets", "⚙️"], ["Storage Containers", "📦"],
      ]},
      { name: "Living Room", emoji: "🛋️", children: [
        ["Throws & Cushions", "🛋️"], ["Rugs & Mats", "🪷"],
        ["Picture Frames & Wall Art", "🖼️"], ["Decorative Accessories", "🕯️"], ["Clocks & Mirrors", "🕐"],
      ]},
      { name: "Storage & Organisation", emoji: "📦", children: [
        ["Shelving & Bookcases", "📚"], ["Storage Boxes & Baskets", "📦"],
        ["Hangers & Wardrobe Organisers", "👔"], ["Drawer Dividers", "🗂️"], ["Under-Bed Storage", "🛏️"],
      ]},
      { name: "Lighting", emoji: "💡", children: [
        ["Ceiling Lights & Pendants", "💡"], ["Table & Floor Lamps", "🪔"],
        ["LED Bulbs", "✨"], ["Smart Lighting", "🏠"], ["Outdoor Lights", "🌟"],
      ]},
    ],
  },
  {
    slug: "electronics-gaming", name: "Electronics & Gaming",
    children: [
      { name: "TVs & Home Cinema", emoji: "📺", children: [
        ["Smart TVs", "📺"], ["Projectors", "🎬"],
        ["Soundbars & Speakers", "🔊"], ["Streaming Devices", "📡"], ["Blu-Ray Players", "📀"],
      ]},
      { name: "Computing", emoji: "💻", children: [
        ["Laptops", "💻"], ["Tablets & iPads", "📱"],
        ["PC Accessories & Monitors", "🖥️"], ["Printers & Scanners", "🖨️"], ["External Storage", "💾"],
      ]},
      { name: "Phones & Wearables", emoji: "📱", children: [
        ["Smartphones", "📱"], ["Smartwatches", "⌚"],
        ["Earbuds & Headphones", "🎧"], ["Phone Cases & Covers", "📱"], ["Chargers & Cables", "🔌"],
      ]},
      { name: "Gaming", emoji: "🎮", children: [
        ["Consoles", "🕹️"], ["Games & Software", "💿"],
        ["Controllers & Peripherals", "🎮"], ["Gaming Headsets", "🎧"], ["Gaming Chairs & Desks", "🪑"],
      ]},
      { name: "Smart Home & Security", emoji: "🏠", children: [
        ["Smart Speakers & Displays", "🔊"], ["Security Cameras", "📷"],
        ["Smart Plugs & Switches", "🔌"], ["Video Doorbells", "🔔"], ["Smart Thermostats", "❄️"],
      ]},
    ],
  },
  {
    slug: "clothing-accessories", name: "Clothing & Accessories",
    children: [
      { name: "Men's Clothing", emoji: "👔", children: [
        ["Men's T-Shirts", "👕"], ["Men's Shirts & Polos", "👔"],
        ["Men's Jeans & Trousers", "👖"], ["Men's Hoodies & Sweatshirts", "🧥"], ["Men's Suits & Blazers", "🤵"],
      ]},
      { name: "Women's Clothing", emoji: "👗", children: [
        ["Women's Dresses", "👗"], ["Women's Tops & Blouses", "👚"],
        ["Women's Jeans & Trousers", "👖"], ["Women's Knitwear & Jumpers", "🧶"], ["Women's Coats & Jackets", "🧥"],
      ]},
      { name: "Kids' Clothing", emoji: "👦", children: [
        ["Boys T-Shirts & Tops", "👕"], ["Girls Dresses & Tops", "👗"],
        ["School Uniform", "🏫"], ["Kids' Sportswear", "🏃"], ["Kids' Outerwear", "🧥"],
      ]},
      { name: "Footwear", emoji: "👟", children: [
        ["Trainers & Sneakers", "👟"], ["Boots & Ankle Boots", "👢"],
        ["Sandals & Flip Flops", "🩴"], ["Formal & Smart Shoes", "👠"], ["Slippers", "🥿"],
      ]},
      { name: "Accessories", emoji: "👜", children: [
        ["Bags & Handbags", "👜"], ["Hats & Caps", "🧢"],
        ["Scarves & Gloves", "🧤"], ["Jewellery & Watches", "💍"], ["Belts & Sunglasses", "🕶️"],
      ]},
    ],
  },
  {
    slug: "toys-games", name: "Toys & Games",
    children: [
      { name: "Building & Construction", emoji: "🧱", children: [
        ["LEGO & Brick Sets", "🧱"], ["Magnetic Tiles", "🔲"],
        ["Wooden Blocks & Stacking", "🪵"], ["Construction Vehicles", "🚧"], ["Marble Runs", "⚙️"],
      ]},
      { name: "Outdoor Play", emoji: "🌳", children: [
        ["Scooters & Balance Bikes", "🛵"], ["Sports Balls & Sets", "⚽"],
        ["Sandpit & Water Toys", "🏖️"], ["Garden Games", "🎯"], ["Trampolines & Climbing", "🤸"],
      ]},
      { name: "Arts & Crafts", emoji: "🎨", children: [
        ["Painting & Drawing Sets", "🎨"], ["Colouring Books", "📕"],
        ["Clay & Modelling", "🧱"], ["Sticker Sets & Pens", "🖊️"], ["Craft Kits", "🧵"],
      ]},
      { name: "Board Games & Puzzles", emoji: "🎲", children: [
        ["Family Board Games", "🎲"], ["Card Games & Strategy", "🃏"],
        ["Jigsaws & Puzzles", "🧩"], ["Brain Teasers & Logic", "🧠"], ["Party Games", "🎉"],
      ]},
      { name: "Dolls & Figures", emoji: "🪆", children: [
        ["Fashion Dolls & Playsets", "👗"], ["Action Figures & Heroes", "🦸"],
        ["Collectible Figures", "🏆"], ["Plush & Soft Toys", "🧸"], ["Role Play & Dress-Up", "👑"],
      ]},
    ],
  },
  {
    slug: "sports-leisure", name: "Sports & Leisure",
    children: [
      { name: "Fitness Equipment", emoji: "💪", children: [
        ["Dumbbells & Weights", "🏋️"], ["Resistance Bands", "💪"],
        ["Yoga & Pilates Mats", "🧘"], ["Pull-Up Bars", "🤸"], ["Jump Ropes & Cardio", "❤️"],
      ]},
      { name: "Team Sports", emoji: "⚽", children: [
        ["Footballs & Rugby", "🏉"], ["Cricket Equipment", "🏏"],
        ["Basketball & Netball", "🏀"], ["Tennis & Badminton", "🎾"], ["Hockey & Lacrosse", "🥍"],
      ]},
      { name: "Cycling", emoji: "🚴", children: [
        ["Bike Helmets", "🪖"], ["Bike Locks & Security", "🔒"],
        ["Cycling Lights & Reflectors", "💡"], ["Cycling Gloves & Accessories", "🧤"], ["Bike Bags", "🎒"],
      ]},
      { name: "Running & Gym Wear", emoji: "🏃", children: [
        ["Running Shoes & Trainers", "👟"], ["Leggings & Tights", "🧘"],
        ["Sports Bras & Vests", "🩲"], ["Gym Shorts & Bottoms", "🩲"], ["Compression Layers", "🧤"],
      ]},
      { name: "Water Sports & Outdoor", emoji: "🌊", children: [
        ["Swimwear", "🩱"], ["Goggles & Swim Caps", "🥽"],
        ["Snorkelling & Diving", "🤿"], ["Camping Equipment", "🏕️"], ["Hiking Gear", "🥾"],
      ]},
    ],
  },
  {
    slug: "garden-diy-car", name: "Garden, DIY & Car Care",
    children: [
      { name: "Garden", emoji: "🌱", children: [
        ["Seeds, Bulbs & Plants", "🌷"], ["Compost & Plant Feed", "🌱"],
        ["Plant Pots & Planters", "🪴"], ["Garden Tools", "🛠️"], ["Garden Furniture & Decor", "🪑"],
      ]},
      { name: "DIY & Hardware", emoji: "🔨", children: [
        ["Power Tools", "⚡"], ["Hand Tools", "🔨"],
        ["Screws, Nails & Fixings", "🔩"], ["Paint & Decorating", "🎨"], ["Tape, Glue & Adhesives", "🫙"],
      ]},
      { name: "Car Care", emoji: "🚗", children: [
        ["Engine Oil & Fluids", "🛢️"], ["Car Wash & Polish", "🧴"],
        ["Car Air Fresheners", "🌸"], ["Screen Wash & De-Icer", "🧴"], ["Tyre Care & Accessories", "🚗"],
      ]},
      { name: "Pest Control", emoji: "🐛", children: [
        ["Ant & Insect Killers", "🐜"], ["Slug & Snail Pellets", "🐌"],
        ["Weed Killer", "🌿"], ["Fly & Wasp Traps", "🪰"], ["Mouse & Rat Traps", "🐀"],
      ]},
      { name: "BBQ & Outdoor", emoji: "🔥", children: [
        ["BBQ Charcoal & Gas", "⛽"], ["BBQ Tools & Accessories", "🍖"],
        ["Garden Hoses & Sprinklers", "💧"], ["Outdoor Lighting", "💡"], ["Weatherproofing & Covers", "☔"],
      ]},
    ],
  },
  {
    slug: "hobbies-stationery", name: "Hobbies & Stationery",
    children: [
      { name: "Art Supplies", emoji: "🎨", children: [
        ["Acrylic & Oil Paints", "🎨"], ["Watercolour Paints", "💧"],
        ["Canvas & Drawing Paper", "📄"], ["Artist Brushes & Tools", "🖌️"], ["Sketchbooks & Journals", "📒"],
      ]},
      { name: "Craft Materials", emoji: "🧵", children: [
        ["Yarn & Knitting Needles", "🧶"], ["Sewing Kits & Fabric", "✂️"],
        ["Scrapbooking & Papercrafts", "✂️"], ["Embroidery & Cross Stitch", "🧵"], ["Resin & Jewellery Making", "💎"],
      ]},
      { name: "Office Stationery", emoji: "✏️", children: [
        ["Notebooks & Pads", "📓"], ["Pens, Pencils & Markers", "✏️"],
        ["Highlighters & Sticky Notes", "📌"], ["Folders & Filing", "📁"], ["Scissors & Tape", "✂️"],
      ]},
      { name: "Books & Media", emoji: "📚", children: [
        ["Fiction & Literature", "📖"], ["Non-Fiction & Self-Help", "📚"],
        ["Children's Books", "📕"], ["Puzzle & Activity Books", "🧩"], ["Language & Study Books", "📖"],
      ]},
      { name: "Musical Instruments", emoji: "🎵", children: [
        ["Ukuleles & Guitars", "🎸"], ["Keyboards & Synthesisers", "🎹"],
        ["Drumsticks & Percussion", "🥁"], ["Recorders & Wind Instruments", "🎺"], ["Sheet Music & Books", "🎵"],
      ]},
    ],
  },
  {
    slug: "parties-seasonal", name: "Parties & Seasonal",
    children: [
      { name: "Party Supplies", emoji: "🎉", children: [
        ["Balloons & Bunting", "🎈"], ["Party Plates & Cups", "🎊"],
        ["Banners & Signs", "🎉"], ["Party Bags & Fillers", "🎁"], ["Table Decorations", "🌟"],
      ]},
      { name: "Christmas", emoji: "🎄", children: [
        ["Christmas Decorations", "🎄"], ["Christmas Cards & Wrap", "🎁"],
        ["Advent Calendars", "📅"], ["Christmas Crackers", "🎉"], ["Christmas Lights & Tinsel", "✨"],
      ]},
      { name: "Birthday Essentials", emoji: "🎂", children: [
        ["Birthday Candles & Toppers", "🕯️"], ["Birthday Cards", "💌"],
        ["Gift Bags & Tissue Paper", "🎁"], ["Birthday Banners & Balloons", "🎈"], ["Party Hats", "🎊"],
      ]},
      { name: "Halloween & Easter", emoji: "🎃", children: [
        ["Halloween Decorations", "🎃"], ["Halloween Costumes", "👻"],
        ["Easter Eggs & Chocolate", "🐣"], ["Easter Decorations", "🐰"], ["Trick or Treat Sweets", "🍬"],
      ]},
      { name: "Gifting & Wrapping", emoji: "🎁", children: [
        ["Gift Wrap & Rolls", "🎁"], ["Ribbons, Bows & Tags", "🎀"],
        ["Gift Boxes & Bags", "📦"], ["Occasion Cards", "💌"], ["Gift Sets & Hampers", "🧺"],
      ]},
    ],
  },
  // ── Meta categories (subcategories only, no products seeded) ─────────────────
  {
    slug: "marketplace", name: "Marketplace",
    children: [
      { name: "Flash Deals & Offers", emoji: "🔥", children: [
        ["Today's Offers", "🔥"], ["Weekend Deals", "💥"], ["Price Drops", "📉"], ["Clearance", "🏷️"], ["Bundle Deals", "📦"],
      ]},
      { name: "Featured Sellers", emoji: "🏪", children: [
        ["Top Rated Sellers", "⭐"], ["New Sellers", "🆕"], ["Trending", "📈"], ["Premium Sellers", "💎"], ["Seasonal Picks", "🌟"],
      ]},
      { name: "Vouchers & Codes", emoji: "🎟️", children: [
        ["Discount Codes", "🏷️"], ["Gift Vouchers", "🎁"], ["Loyalty Rewards", "❤️"], ["Student Deals", "🎓"], ["App Exclusives", "📱"],
      ]},
      { name: "Subscription Boxes", emoji: "📦", children: [
        ["Weekly Essentials", "📦"], ["Snack Boxes", "🍿"], ["Beauty Boxes", "💄"], ["Pet Boxes", "🐾"], ["Wine Club", "🍷"],
      ]},
      { name: "Bulk & Wholesale", emoji: "🏭", children: [
        ["Bulk Buy", "📦"], ["Office Supplies", "🖊️"], ["Catering Supplies", "🍽️"], ["Restaurant Trade", "🍴"], ["Trade Accounts", "💼"],
      ]},
    ],
  },
  {
    slug: "kiosk", name: "Kiosk",
    children: [
      { name: "Gift Cards", emoji: "🎁", children: [
        ["Gaming Gift Cards", "🎮"], ["Retail Gift Cards", "🛍️"], ["Restaurant Cards", "🍽️"], ["App Store Cards", "📱"], ["Streaming Cards", "📺"],
      ]},
      { name: "Phone Top-Ups", emoji: "📱", children: [
        ["EE Top-Up", "📱"], ["Vodafone Top-Up", "📱"], ["O2 Top-Up", "📱"], ["Three Top-Up", "📱"], ["giffgaff Top-Up", "📱"],
      ]},
      { name: "Travel & Finance", emoji: "🌍", children: [
        ["Travel Money", "💱"], ["Prepaid Cards", "💳"], ["International Transfers", "🌐"], ["Travel Insurance", "✈️"], ["Forex", "💹"],
      ]},
      { name: "Entertainment", emoji: "🎬", children: [
        ["Cinema Tickets", "🎬"], ["Event Passes", "🎟️"], ["Lottery Scratch Cards", "🎰"], ["Raffle Tickets", "🎡"], ["Theme Park Passes", "🎢"],
      ]},
      { name: "Utilities & Bills", emoji: "💳", children: [
        ["Electricity Top-Up", "⚡"], ["Gas Top-Up", "🔥"], ["Council Tax", "🏛️"], ["TV Licence", "📺"], ["Water Bills", "💧"],
      ]},
    ],
  },
  {
    slug: "inspiration-events", name: "Inspiration & Events",
    children: [
      { name: "Seasonal Recipes", emoji: "🍽️", children: [
        ["Summer Recipes", "☀️"], ["Christmas Specials", "🎄"], ["BBQ Ideas", "🔥"], ["Winter Warmers", "❄️"], ["Easter Specials", "🐣"],
      ]},
      { name: "Meal Planners", emoji: "📅", children: [
        ["Weekly Meal Plans", "📅"], ["Budget Cooking", "💰"], ["Family Meals", "👨‍👩‍👧‍👦"], ["Quick Dinners", "⚡"], ["Batch Cooking", "🍳"],
      ]},
      { name: "Gift Guides", emoji: "🎁", children: [
        ["Birthday Gifts", "🎂"], ["Anniversary Gifts", "❤️"], ["Christmas Gifts", "🎄"], ["Housewarming", "🏠"], ["Get Well Soon", "💐"],
      ]},
      { name: "Healthy Living", emoji: "💪", children: [
        ["Balanced Diet", "🥗"], ["Fitness Nutrition", "💪"], ["Vegan & Veggie", "🌱"], ["Gluten-Free Living", "🌾"], ["Weight Management", "⚖️"],
      ]},
      { name: "Food & Lifestyle", emoji: "🌟", children: [
        ["New Products", "🆕"], ["Behind the Brand", "🏷️"], ["Supplier Stories", "🤝"], ["Sustainability", "♻️"], ["Community", "❤️"],
      ]},
    ],
  },
];

// ─── Seeder function ──────────────────────────────────────────────────────────

export async function seedCategories(): Promise<Map<string, mongoose.Types.ObjectId>> {
  await connectDB();

  // Step 1: wipe all categories across all levels
  const { deletedCount } = await CategoryModel.deleteMany({});
  console.log(`   Deleted ${deletedCount} existing categories`);

  // Step 2: insert all 21 level-0 categories from CATEGORY_SEEDS
  const l0Docs = await CategoryModel.insertMany(
    CATEGORY_SEEDS.map((s) => ({ ...s, level: 0, parentId: null })),
    { ordered: true }
  );
  console.log(`   Inserted ${l0Docs.length} level-0 categories`);

  // Step 3: build slug → ObjectId map from freshly inserted level-0s
  const slugToId = new Map<string, mongoose.Types.ObjectId>(
    l0Docs.map((d) => [d.slug, d._id as mongoose.Types.ObjectId])
  );

  const palette = ROOT_COLORS;
  let l1Count = 0;
  let l2Count = 0;

  // Step 4: insert level-1, then level-2 for each root
  for (const l0 of FULL_TREE) {
    const rootId = slugToId.get(l0.slug);
    if (!rootId) {
      console.warn(`   ⚠  Root "${l0.slug}" not found — skipping`);
      continue;
    }
    const { color, textColor } = palette[l0.slug] ?? { color: "bg-gray-50", textColor: "text-gray-700" };

    for (let i1 = 0; i1 < l0.children.length; i1++) {
      const l1Def = l0.children[i1];
      const l1Slug = toSlug(`${l0.slug}-${l1Def.name}`);

      const l1Doc = await CategoryModel.create({
        name: l1Def.name,
        slug: l1Slug,
        emoji: l1Def.emoji,
        description: "",
        image: "",
        color, textColor,
        order: i1 + 1,
        level: 1,
        parentId: rootId,
        isActive: true,
        productCount: 0,
      });
      slugToId.set(l1Slug, l1Doc._id as mongoose.Types.ObjectId);
      l1Count++;

      for (let i2 = 0; i2 < l1Def.children.length; i2++) {
        const [l2Name, l2Emoji] = l1Def.children[i2];
        const l2Slug = toSlug(`${l1Slug}-${l2Name}`);

        const l2Doc = await CategoryModel.create({
          name: l2Name,
          slug: l2Slug,
          emoji: l2Emoji,
          description: "",
          image: "",
          color, textColor,
          order: i2 + 1,
          level: 2,
          parentId: l1Doc._id,
          isActive: true,
          productCount: 0,
        });
        slugToId.set(l2Slug, l2Doc._id as mongoose.Types.ObjectId);
        l2Count++;
      }
    }
  }

  console.log(`   ✅  Inserted ${l1Count} level-1, ${l2Count} level-2 categories`);
  return slugToId;
}
