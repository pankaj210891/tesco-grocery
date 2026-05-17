/**
 * Sub-category seed data for the 3-level Department mega menu.
 * parentSlug → top-level category; grandparentSlug → level-1 sub-category.
 * Run /api/categories/tree/seed (POST) to insert this data.
 */

export interface SubCategorySeed {
  name:         string;
  slug:         string;
  emoji:        string;
  description:  string;
  color:        string;
  textColor:    string;
  order:        number;
  level:        1 | 2;
  parentSlug:   string;
}

export const SUBCATEGORY_SEEDS: SubCategorySeed[] = [
  // ── Fresh Food (level 1) ────────────────────────────────────────────────────
  { name: "Vegetables",        slug: "vegetables",        emoji: "🥕", description: "Fresh vegetables from local farms.",             color: "bg-green-50",   textColor: "text-green-700",   order: 1, level: 1, parentSlug: "fresh-food" },
  { name: "Fruits",            slug: "fruits",            emoji: "🍎", description: "Seasonal fruits, berries and citrus.",           color: "bg-green-50",   textColor: "text-green-700",   order: 2, level: 1, parentSlug: "fresh-food" },
  { name: "Dairy, Eggs & Chilled", slug: "dairy-eggs",   emoji: "🥛", description: "Milk, cheese, yoghurt, eggs and chilled goods.", color: "bg-green-50",   textColor: "text-green-700",   order: 3, level: 1, parentSlug: "fresh-food" },
  { name: "Meat & Fish",       slug: "meat-fish",         emoji: "🥩", description: "Fresh meat, poultry, fish and seafood.",         color: "bg-green-50",   textColor: "text-green-700",   order: 4, level: 1, parentSlug: "fresh-food" },

  // ── Fresh Food — level 2 (Vegetables children) ─────────────────────────────
  { name: "Organic Vegetables", slug: "organic-vegetables", emoji: "🌱", description: "Certified organic veg.",  color: "bg-green-50", textColor: "text-green-700", order: 1, level: 2, parentSlug: "vegetables" },
  { name: "Salads & Leaves",    slug: "salads-leaves",      emoji: "🥗", description: "Ready-to-eat salad bags.", color: "bg-green-50", textColor: "text-green-700", order: 2, level: 2, parentSlug: "vegetables" },
  { name: "Root Vegetables",    slug: "root-vegetables",    emoji: "🥔", description: "Potatoes, carrots, parsnips.", color: "bg-green-50", textColor: "text-green-700", order: 3, level: 2, parentSlug: "vegetables" },

  // ── Fresh Food — level 2 (Fruits children) ─────────────────────────────────
  { name: "Berries",            slug: "berries",            emoji: "🍓", description: "Strawberries, blueberries, raspberries.", color: "bg-green-50", textColor: "text-green-700", order: 1, level: 2, parentSlug: "fruits" },
  { name: "Citrus & Tropical",  slug: "citrus-tropical",    emoji: "🍊", description: "Oranges, lemons, mangoes, pineapple.",   color: "bg-green-50", textColor: "text-green-700", order: 2, level: 2, parentSlug: "fruits" },
  { name: "Apples & Pears",     slug: "apples-pears",       emoji: "🍏", description: "Crisp apples and ripe pears.",           color: "bg-green-50", textColor: "text-green-700", order: 3, level: 2, parentSlug: "fruits" },

  // ── Fresh Food — level 2 (Dairy children) ──────────────────────────────────
  { name: "Milk & Cream",       slug: "milk-cream",         emoji: "🥛", description: "Whole, semi-skimmed, oat and cream.",    color: "bg-green-50", textColor: "text-green-700", order: 1, level: 2, parentSlug: "dairy-eggs" },
  { name: "Cheese",             slug: "cheese",             emoji: "🧀", description: "Cheddar, brie, mozzarella and more.",    color: "bg-green-50", textColor: "text-green-700", order: 2, level: 2, parentSlug: "dairy-eggs" },
  { name: "Yoghurt",            slug: "yoghurt",            emoji: "🍦", description: "Natural, Greek and flavoured yoghurts.", color: "bg-green-50", textColor: "text-green-700", order: 3, level: 2, parentSlug: "dairy-eggs" },

  // ── Bakery (level 1) ────────────────────────────────────────────────────────
  { name: "Breads & Rolls",   slug: "breads-rolls",    emoji: "🍞", description: "Loaves, rolls and artisan breads.",      color: "bg-amber-50", textColor: "text-amber-700", order: 1, level: 1, parentSlug: "bakery" },
  { name: "Cakes & Pastries", slug: "cakes-pastries",  emoji: "🎂", description: "Cakes, tarts and sweet pastries.",       color: "bg-amber-50", textColor: "text-amber-700", order: 2, level: 1, parentSlug: "bakery" },
  { name: "Morning Goods",    slug: "morning-goods",   emoji: "🥐", description: "Croissants, muffins and Danish pastries.", color: "bg-amber-50", textColor: "text-amber-700", order: 3, level: 1, parentSlug: "bakery" },

  // ── Bakery — level 2 ───────────────────────────────────────────────────────
  { name: "White Bread",       slug: "white-bread",       emoji: "🍞", description: "Classic white loaves and rolls.",        color: "bg-amber-50", textColor: "text-amber-700", order: 1, level: 2, parentSlug: "breads-rolls" },
  { name: "Wholemeal & Seeded", slug: "wholemeal-seeded", emoji: "🌾", description: "Wholegrain and seeded varieties.",       color: "bg-amber-50", textColor: "text-amber-700", order: 2, level: 2, parentSlug: "breads-rolls" },
  { name: "Cakes & Gateaux",  slug: "cakes-gateaux",     emoji: "🎂", description: "Celebration and everyday cakes.",        color: "bg-amber-50", textColor: "text-amber-700", order: 1, level: 2, parentSlug: "cakes-pastries" },
  { name: "Muffins & Cupcakes", slug: "muffins-cupcakes", emoji: "🧁", description: "Freshly baked muffins and cupcakes.",   color: "bg-amber-50", textColor: "text-amber-700", order: 2, level: 2, parentSlug: "cakes-pastries" },
  { name: "Croissants",        slug: "croissants",        emoji: "🥐", description: "Butter and almond croissants.",          color: "bg-amber-50", textColor: "text-amber-700", order: 1, level: 2, parentSlug: "morning-goods" },
  { name: "Danish Pastries",   slug: "danish-pastries",   emoji: "🥐", description: "Pain au chocolat and Danish twists.",   color: "bg-amber-50", textColor: "text-amber-700", order: 2, level: 2, parentSlug: "morning-goods" },

  // ── Treats & Snacks (level 1) ───────────────────────────────────────────────
  { name: "Crisps & Popcorn",     slug: "crisps-popcorn",     emoji: "🍿", description: "Crisps, popcorn and corn chips.",      color: "bg-orange-50", textColor: "text-orange-700", order: 1, level: 1, parentSlug: "treats-snacks" },
  { name: "Chocolate & Sweets",   slug: "chocolate-sweets",   emoji: "🍫", description: "Chocolate bars, sweets and candy.",    color: "bg-orange-50", textColor: "text-orange-700", order: 2, level: 1, parentSlug: "treats-snacks" },
  { name: "Biscuits & Crackers",  slug: "biscuits-crackers",  emoji: "🍪", description: "Sweet biscuits and savoury crackers.", color: "bg-orange-50", textColor: "text-orange-700", order: 3, level: 1, parentSlug: "treats-snacks" },
  { name: "Nuts & Dried Fruit",   slug: "nuts-dried-fruit",   emoji: "🥜", description: "Roasted nuts, trail mix and dried fruit.", color: "bg-orange-50", textColor: "text-orange-700", order: 4, level: 1, parentSlug: "treats-snacks" },

  // ── Treats & Snacks — level 2 ──────────────────────────────────────────────
  { name: "Crisps",          slug: "crisps",          emoji: "🍟", description: "Classic and flavoured crisps.",       color: "bg-orange-50", textColor: "text-orange-700", order: 1, level: 2, parentSlug: "crisps-popcorn" },
  { name: "Popcorn",         slug: "popcorn",         emoji: "🍿", description: "Sweet and salted popcorn.",           color: "bg-orange-50", textColor: "text-orange-700", order: 2, level: 2, parentSlug: "crisps-popcorn" },
  { name: "Chocolate Bars",  slug: "chocolate-bars",  emoji: "🍫", description: "Milk, dark and white chocolate.",     color: "bg-orange-50", textColor: "text-orange-700", order: 1, level: 2, parentSlug: "chocolate-sweets" },
  { name: "Candy & Gummies", slug: "candy-gummies",   emoji: "🍬", description: "Gummy bears, jelly beans and candy.", color: "bg-orange-50", textColor: "text-orange-700", order: 2, level: 2, parentSlug: "chocolate-sweets" },
  { name: "Sweet Biscuits",  slug: "sweet-biscuits",  emoji: "🍪", description: "Digestives, bourbons and cookies.",   color: "bg-orange-50", textColor: "text-orange-700", order: 1, level: 2, parentSlug: "biscuits-crackers" },
  { name: "Savoury Crackers", slug: "savoury-crackers", emoji: "🧇", description: "Rice cakes, oatcakes and breadsticks.", color: "bg-orange-50", textColor: "text-orange-700", order: 2, level: 2, parentSlug: "biscuits-crackers" },

  // ── Drinks (level 1) ────────────────────────────────────────────────────────
  { name: "Soft Drinks",         slug: "soft-drinks",         emoji: "🥤", description: "Carbonated drinks, squash and cordials.", color: "bg-purple-50", textColor: "text-purple-700", order: 1, level: 1, parentSlug: "drinks" },
  { name: "Water",               slug: "water",               emoji: "💧", description: "Still, sparkling and flavoured water.",   color: "bg-purple-50", textColor: "text-purple-700", order: 2, level: 1, parentSlug: "drinks" },
  { name: "Tea & Coffee",        slug: "tea-coffee",          emoji: "☕", description: "Tea bags, ground coffee and pods.",        color: "bg-purple-50", textColor: "text-purple-700", order: 3, level: 1, parentSlug: "drinks" },
  { name: "Juices & Smoothies",  slug: "juices-smoothies",    emoji: "🧃", description: "Pure juices and blended smoothies.",       color: "bg-purple-50", textColor: "text-purple-700", order: 4, level: 1, parentSlug: "drinks" },

  // ── Drinks — level 2 ───────────────────────────────────────────────────────
  { name: "Carbonated Drinks",  slug: "carbonated-drinks",  emoji: "🫧", description: "Cola, lemonade and sparkling drinks.",  color: "bg-purple-50", textColor: "text-purple-700", order: 1, level: 2, parentSlug: "soft-drinks" },
  { name: "Squash & Cordials",  slug: "squash-cordials",    emoji: "🍹", description: "Concentrated squash and cordials.",      color: "bg-purple-50", textColor: "text-purple-700", order: 2, level: 2, parentSlug: "soft-drinks" },
  { name: "Still Water",        slug: "still-water",        emoji: "💧", description: "Bottled still water.",                  color: "bg-purple-50", textColor: "text-purple-700", order: 1, level: 2, parentSlug: "water" },
  { name: "Sparkling Water",    slug: "sparkling-water",    emoji: "🫧", description: "Carbonated and sparkling water.",       color: "bg-purple-50", textColor: "text-purple-700", order: 2, level: 2, parentSlug: "water" },
  { name: "Tea Bags",           slug: "tea-bags",           emoji: "🍵", description: "Black, green and herbal teas.",         color: "bg-purple-50", textColor: "text-purple-700", order: 1, level: 2, parentSlug: "tea-coffee" },
  { name: "Ground Coffee",      slug: "ground-coffee",      emoji: "☕", description: "Espresso, filter and whole bean.",      color: "bg-purple-50", textColor: "text-purple-700", order: 2, level: 2, parentSlug: "tea-coffee" },
  { name: "Coffee Pods",        slug: "coffee-pods",        emoji: "☕", description: "Nespresso, Dolce Gusto pods.",          color: "bg-purple-50", textColor: "text-purple-700", order: 3, level: 2, parentSlug: "tea-coffee" },
  { name: "Pure Juices",        slug: "pure-juices",        emoji: "🍊", description: "Orange, apple and mixed juices.",       color: "bg-purple-50", textColor: "text-purple-700", order: 1, level: 2, parentSlug: "juices-smoothies" },
  { name: "Smoothies",          slug: "smoothies",          emoji: "🫐", description: "Fruit and protein smoothies.",           color: "bg-purple-50", textColor: "text-purple-700", order: 2, level: 2, parentSlug: "juices-smoothies" },

  // ── Health & Beauty (level 1) ───────────────────────────────────────────────
  { name: "Skincare",               slug: "skincare",             emoji: "✨", description: "Face and body skincare.",               color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 1, level: 1, parentSlug: "health-beauty" },
  { name: "Haircare",               slug: "haircare",             emoji: "💇", description: "Shampoo, conditioner and styling.",      color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 2, level: 1, parentSlug: "health-beauty" },
  { name: "Vitamins & Supplements", slug: "vitamins-supplements", emoji: "💊", description: "Vitamins, minerals and supplements.",    color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 3, level: 1, parentSlug: "health-beauty" },
  { name: "Medicines",              slug: "medicines",            emoji: "💉", description: "OTC medicines and first aid.",           color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 4, level: 1, parentSlug: "health-beauty" },

  // ── Health & Beauty — level 2 ──────────────────────────────────────────────
  { name: "Face Care",       slug: "face-care",       emoji: "💆", description: "Moisturisers, serums and cleansers.", color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 1, level: 2, parentSlug: "skincare" },
  { name: "Body Lotion",     slug: "body-lotion",     emoji: "🧴", description: "Body moisturisers and oils.",        color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 2, level: 2, parentSlug: "skincare" },
  { name: "Sun Care",        slug: "sun-care",        emoji: "☀️", description: "SPF creams and after-sun.",          color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 3, level: 2, parentSlug: "skincare" },
  { name: "Shampoo",         slug: "shampoo",         emoji: "🚿", description: "All hair types shampoo.",            color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 1, level: 2, parentSlug: "haircare" },
  { name: "Conditioner",     slug: "conditioner",     emoji: "💆", description: "Nourishing conditioners.",           color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 2, level: 2, parentSlug: "haircare" },
  { name: "Vitamins",        slug: "vitamins",        emoji: "💊", description: "Daily vitamins A, C, D and B12.",   color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 1, level: 2, parentSlug: "vitamins-supplements" },
  { name: "Protein & Fitness", slug: "protein-fitness", emoji: "💪", description: "Protein shakes and fitness supplements.", color: "bg-fuchsia-50", textColor: "text-fuchsia-700", order: 2, level: 2, parentSlug: "vitamins-supplements" },

  // ── Electronics & Gaming (level 1) ─────────────────────────────────────────
  { name: "TVs & Audio",          slug: "tvs-audio",          emoji: "📺", description: "Smart TVs, soundbars and speakers.",     color: "bg-blue-50", textColor: "text-blue-700", order: 1, level: 1, parentSlug: "electronics-gaming" },
  { name: "Laptops & Tablets",    slug: "laptops-tablets",    emoji: "💻", description: "Laptops, tablets and accessories.",      color: "bg-blue-50", textColor: "text-blue-700", order: 2, level: 1, parentSlug: "electronics-gaming" },
  { name: "Gaming",               slug: "gaming",             emoji: "🎮", description: "Consoles, games and gaming gear.",       color: "bg-blue-50", textColor: "text-blue-700", order: 3, level: 1, parentSlug: "electronics-gaming" },
  { name: "Smart Home",           slug: "smart-home",         emoji: "🏠", description: "Smart speakers, cameras and plugs.",     color: "bg-blue-50", textColor: "text-blue-700", order: 4, level: 1, parentSlug: "electronics-gaming" },

  // ── Electronics & Gaming — level 2 ─────────────────────────────────────────
  { name: "Smart TVs",       slug: "smart-tvs",        emoji: "📺", description: "4K and OLED smart televisions.",     color: "bg-blue-50", textColor: "text-blue-700", order: 1, level: 2, parentSlug: "tvs-audio" },
  { name: "Soundbars",       slug: "soundbars",        emoji: "🔊", description: "Home cinema soundbars.",             color: "bg-blue-50", textColor: "text-blue-700", order: 2, level: 2, parentSlug: "tvs-audio" },
  { name: "Headphones",      slug: "headphones",       emoji: "🎧", description: "Over-ear and in-ear headphones.",    color: "bg-blue-50", textColor: "text-blue-700", order: 3, level: 2, parentSlug: "tvs-audio" },
  { name: "Laptops",         slug: "laptops",          emoji: "💻", description: "Windows and MacBook laptops.",       color: "bg-blue-50", textColor: "text-blue-700", order: 1, level: 2, parentSlug: "laptops-tablets" },
  { name: "Tablets",         slug: "tablets",          emoji: "📱", description: "iPad, Android and Fire tablets.",   color: "bg-blue-50", textColor: "text-blue-700", order: 2, level: 2, parentSlug: "laptops-tablets" },
  { name: "Consoles",        slug: "consoles",         emoji: "🕹️", description: "PlayStation, Xbox and Nintendo.",   color: "bg-blue-50", textColor: "text-blue-700", order: 1, level: 2, parentSlug: "gaming" },
  { name: "Games",           slug: "games",            emoji: "🎮", description: "PS5, Xbox and Switch game titles.",  color: "bg-blue-50", textColor: "text-blue-700", order: 2, level: 2, parentSlug: "gaming" },
  { name: "Gaming Accessories", slug: "gaming-accessories", emoji: "🎧", description: "Controllers, headsets, chargers.", color: "bg-blue-50", textColor: "text-blue-700", order: 3, level: 2, parentSlug: "gaming" },

  // ── Household (level 1) ─────────────────────────────────────────────────────
  { name: "Cleaning",      slug: "cleaning",      emoji: "🧹", description: "Surface cleaners, mops and cloths.",    color: "bg-gray-50", textColor: "text-gray-700", order: 1, level: 1, parentSlug: "household" },
  { name: "Laundry",       slug: "laundry",       emoji: "👕", description: "Detergents, softeners and stain removers.", color: "bg-gray-50", textColor: "text-gray-700", order: 2, level: 1, parentSlug: "household" },
  { name: "Kitchen Essentials", slug: "kitchen-essentials", emoji: "🍳", description: "Foil, clingfilm and storage bags.", color: "bg-gray-50", textColor: "text-gray-700", order: 3, level: 1, parentSlug: "household" },
  { name: "Paper & Tissues", slug: "paper-tissues", emoji: "🧻", description: "Toilet roll, kitchen roll and tissues.", color: "bg-gray-50", textColor: "text-gray-700", order: 4, level: 1, parentSlug: "household" },

  // ── Household — level 2 ────────────────────────────────────────────────────
  { name: "Surface Cleaners",  slug: "surface-cleaners",  emoji: "🧹", description: "Multi-surface and kitchen sprays.", color: "bg-gray-50", textColor: "text-gray-700", order: 1, level: 2, parentSlug: "cleaning" },
  { name: "Bathroom Cleaning", slug: "bathroom-cleaning", emoji: "🚿", description: "Toilet cleaners and bleach.",        color: "bg-gray-50", textColor: "text-gray-700", order: 2, level: 2, parentSlug: "cleaning" },
  { name: "Floor Cleaning",    slug: "floor-cleaning",    emoji: "🧺", description: "Mops, floor cleaners and vacuums.", color: "bg-gray-50", textColor: "text-gray-700", order: 3, level: 2, parentSlug: "cleaning" },
  { name: "Washing Powder",    slug: "washing-powder",    emoji: "👕", description: "Bio and non-bio washing powder.",   color: "bg-gray-50", textColor: "text-gray-700", order: 1, level: 2, parentSlug: "laundry" },
  { name: "Fabric Softener",   slug: "fabric-softener",   emoji: "🌸", description: "Conditioners and fresheners.",     color: "bg-gray-50", textColor: "text-gray-700", order: 2, level: 2, parentSlug: "laundry" },
];
