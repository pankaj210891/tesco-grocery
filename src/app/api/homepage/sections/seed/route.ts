import { NextResponse } from "next/server";

function days(n: number) {
  return new Date(Date.now() + n * 86_400_000);
}

const SECTIONS = [
  // ─── 1. What's new this week ────────────────────────────────────────────────
  {
    key:      "whats-new",
    title:    "What's new this week?",
    subtitle: "Fresh arrivals and seasonal picks, updated every week",
    type:     "product-carousel",
    order:    1,
    ctaLabel: "Shop all new",
    ctaHref:  "/products?sortBy=newest",
    items: [
      { title: "Organic Whole Milk 2L",    brand: "Prakash Organic",  price: 1.79, emoji: "🥛", color: "#EFF6FF", badge: "New",  href: "/categories/fresh-food",        order: 1 },
      { title: "Sourdough Bloomer Loaf",   brand: "Artisan Bakery",   price: 2.49, emoji: "🍞", color: "#FFFBEB", badge: "New",  href: "/categories/bakery",            order: 2 },
      { title: "Sparkling Elderflower",    brand: "Fentimans",        price: 1.59, emoji: "🌸", color: "#FDF4FF", badge: "New",  href: "/categories/drinks",            order: 3 },
      { title: "Mixed Berry Granola 500g", brand: "Prakash Finest",   price: 3.49, emoji: "🫐", color: "#F0FDF4", badge: "New",  href: "/categories/food-cupboard",     order: 4 },
      { title: "Smoked Scottish Salmon",   brand: "Scottish Select",  price: 4.99, emoji: "🐟", color: "#FFF1F2", badge: "New",  href: "/categories/fresh-food",        order: 5 },
      { title: "Dark Chocolate 85% 100g",  brand: "Lindt",            price: 2.29, emoji: "🍫", color: "#FEF3C7", badge: "New",  href: "/categories/treats-snacks",     order: 6 },
      { title: "Greek Style Yoghurt 500g", brand: "Chobani",          price: 2.79, emoji: "🍶", color: "#F0F9FF", badge: "New",  href: "/categories/fresh-food",        order: 7 },
      { title: "Avocado Dip & Guacamole",  brand: "Wholly Guacamole", price: 2.49, emoji: "🥑", color: "#F0FDF4", badge: "New",  href: "/categories/fresh-food",        order: 8 },
    ],
  },

  // ─── 2. Top picks for you this week ─────────────────────────────────────────
  {
    key:      "top-picks",
    title:    "Top picks for you this week",
    subtitle: "Handpicked by our team just for you",
    type:     "product-carousel",
    order:    2,
    ctaLabel: "See all picks",
    ctaHref:  "/products?sortBy=rating",
    items: [
      { title: "Medium Cheddar 400g",    brand: "Cathedral City",  price: 3.25, emoji: "🧀", color: "#FEF3C7", badge: "Popular", href: "/categories/fresh-food",    order: 1 },
      { title: "Free Range Eggs 12pk",   brand: "Happy Hens",      price: 3.50, emoji: "🥚", color: "#FFFBEB", badge: "Popular", href: "/categories/fresh-food",    order: 2 },
      { title: "Chicken Breast 1kg",     brand: "Prakash Finest",  price: 5.99, emoji: "🍗", color: "#FFF7ED", badge: "Popular", href: "/categories/fresh-food",    order: 3 },
      { title: "Basmati Rice 2kg",       brand: "Tilda",           price: 4.50, emoji: "🍚", color: "#F9FAFB", badge: "Popular", href: "/categories/food-cupboard", order: 4 },
      { title: "Extra Virgin Olive Oil", brand: "Filippo Berio",   price: 5.75, emoji: "🫒", color: "#F0FDF4", badge: "Popular", href: "/categories/food-cupboard", order: 5 },
      { title: "Fresh Tagliatelle 400g", brand: "De Cecco",        price: 2.49, emoji: "🍝", color: "#FFFBEB", badge: "Popular", href: "/categories/food-cupboard", order: 6 },
      { title: "Sparkling Water 12pk",   brand: "Buxton",          price: 3.99, emoji: "💧", color: "#EFF6FF", badge: "Popular", href: "/categories/drinks",        order: 7 },
      { title: "Butter Croissants 6pk",  brand: "Prakash Bakery",  price: 2.25, emoji: "🥐", color: "#FEF9C3", badge: "Popular", href: "/categories/bakery",        order: 8 },
    ],
  },

  // ─── 3. Popular offers ending soon ──────────────────────────────────────────
  {
    key:      "popular-offers",
    title:    "Popular offers ending soon",
    subtitle: "Grab these deals before they're gone",
    type:     "offer-cards",
    order:    3,
    ctaLabel: "All offers",
    ctaHref:  "/offers",
    items: [
      { title: "Baked Beans 4pk 415g",    brand: "Heinz",      price: 2.00, originalPrice: 2.89, discount: 31, emoji: "🫘", color: "#FFF0F3", badge: "31% off", expiresAt: days(2), href: "/categories/food-cupboard", order: 1 },
      { title: "Orange Juice 1L",         brand: "Tropicana",  price: 1.89, originalPrice: 2.75, discount: 31, emoji: "🍊", color: "#FFF7ED", badge: "31% off", expiresAt: days(3), href: "/categories/drinks",        order: 2 },
      { title: "Tomato Ketchup 570g",     brand: "Heinz",      price: 1.79, originalPrice: 2.39, discount: 25, emoji: "🍅", color: "#FFF1F2", badge: "25% off", expiresAt: days(1), href: "/categories/food-cupboard", order: 3 },
      { title: "Cornflakes 750g",         brand: "Kellogg's",  price: 2.49, originalPrice: 3.49, discount: 29, emoji: "🌾", color: "#FFFBEB", badge: "29% off", expiresAt: days(4), href: "/categories/food-cupboard", order: 4 },
      { title: "Digestive Biscuits 400g", brand: "McVitie's",  price: 1.25, originalPrice: 1.89, discount: 34, emoji: "🍪", color: "#FEF9C3", badge: "34% off", expiresAt: days(2), href: "/categories/treats-snacks", order: 5 },
      { title: "Whole Milk 4pt",          brand: "Arla",       price: 1.30, originalPrice: 1.65, discount: 21, emoji: "🥛", color: "#EFF6FF", badge: "21% off", expiresAt: days(5), href: "/categories/fresh-food",    order: 6 },
      { title: "Crisps Variety 6pk",      brand: "Walkers",    price: 2.00, originalPrice: 2.79, discount: 28, emoji: "🥔", color: "#FEF3C7", badge: "28% off", expiresAt: days(3), href: "/categories/treats-snacks", order: 7 },
      { title: "Cola 6pk 330ml Cans",     brand: "Coca-Cola",  price: 3.49, originalPrice: 4.99, discount: 30, emoji: "🥤", color: "#FFF0F3", badge: "30% off", expiresAt: days(2), href: "/categories/drinks",        order: 8 },
    ],
  },

  // ─── 4. Inspiration from sellers' big brands ─────────────────────────────────
  {
    key:      "inspiration",
    title:    "Inspiration from sellers' big brands",
    subtitle: "Discover what our brand partners have in store",
    type:     "brand-inspiration",
    order:    4,
    items: [
      { title: "Heinz",     subtitle: "The nation's favourite since 1869",   description: "50+ iconic varieties — from ketchup to beans and beyond", emoji: "🍅", color: "#C41230", href: "/categories/food-cupboard",  order: 1 },
      { title: "Cadbury",   subtitle: "Real chocolate. Real indulgence.",     description: "Britain's best-loved chocolate — explore the full range",  emoji: "🍫", color: "#7B2D8B", href: "/categories/treats-snacks",  order: 2 },
      { title: "Kellogg's", subtitle: "Start your day the right way",         description: "Cereals, snacks and more for the whole family",            emoji: "🌾", color: "#D62828", href: "/categories/food-cupboard",  order: 3 },
      { title: "Coca-Cola", subtitle: "Taste the feeling",                    description: "Refresh your world with the world's favourite drink",      emoji: "🥤", color: "#E61B2A", href: "/categories/drinks",         order: 4 },
    ],
  },

  // ─── 5. Trending now ─────────────────────────────────────────────────────────
  {
    key:      "trending",
    title:    "Trending now",
    subtitle: "What everyone is adding to their baskets this week",
    type:     "product-carousel",
    order:    5,
    ctaLabel: "See all trending",
    ctaHref:  "/products?sortBy=rating",
    items: [
      { title: "Gut Health Kombucha 330ml", brand: "Health-Ade",   price: 3.29, emoji: "🍵", color: "#F0FDF4", badge: "🔥 Hot", href: "/categories/drinks",        order: 1 },
      { title: "Protein Overnight Oats",   brand: "Moma",          price: 2.99, emoji: "🥣", color: "#FFFBEB", badge: "🔥 Hot", href: "/categories/food-cupboard", order: 2 },
      { title: "Oat Milk Barista 1L",      brand: "Oatly",         price: 2.25, emoji: "🌾", color: "#FEF9C3", badge: "🔥 Hot", href: "/categories/drinks",        order: 3 },
      { title: "Peanut Butter Smooth",     brand: "Meridian",      price: 3.49, emoji: "🥜", color: "#FEF3C7", badge: "🔥 Hot", href: "/categories/food-cupboard", order: 4 },
      { title: "Matcha Green Tea 100g",    brand: "Clearspring",   price: 7.99, emoji: "🍵", color: "#F0FDF4", badge: "🔥 Hot", href: "/categories/drinks",        order: 5 },
      { title: "Chia Seeds 300g",          brand: "Linwoods",      price: 4.49, emoji: "🌱", color: "#F0F9FF", badge: "🔥 Hot", href: "/categories/food-cupboard", order: 6 },
      { title: "Coconut Water 1L",         brand: "Vita Coco",     price: 2.49, emoji: "🥥", color: "#F0FDF4", badge: "🔥 Hot", href: "/categories/drinks",        order: 7 },
      { title: "Plant-Based Mince 400g",   brand: "Quorn",         price: 3.75, emoji: "🌿", color: "#F0FDF4", badge: "🔥 Hot", href: "/categories/fresh-food",    order: 8 },
    ],
  },

  // ─── 6. Ways to shop and save ────────────────────────────────────────────────
  {
    key:      "ways-to-shop",
    title:    "Ways to shop and save",
    subtitle: "Making great value shopping easier for everyone",
    type:     "info-cards",
    order:    6,
    items: [
      { title: "Free Next-Day Delivery",  description: "Free on all orders over £40. Fast, reliable, tracked.",  emoji: "🚚", color: "#EFF6FF", href: "/faq",            order: 1 },
      { title: "Click & Collect",         description: "Order online and pick up from your nearest store.",        emoji: "🏪", color: "#F0FDF4", href: "/store-locator",  order: 2 },
      { title: "Price Match Promise",     description: "Find it cheaper elsewhere? We'll match the price.",        emoji: "🏷️", color: "#FFF7ED", href: "/faq",            order: 3 },
      { title: "Loyalty Points",          description: "Earn 1 point per £1 spent — redeem on any order.",        emoji: "⭐", color: "#FEFCE8", href: "/account",        order: 4 },
      { title: "Student Discount",        description: "Exclusive 10% off sitewide — just verify your status.",   emoji: "🎓", color: "#FDF4FF", href: "/faq",            order: 5 },
      { title: "Subscribe & Save",        description: "Set up auto-delivery and save 15% on every order.",       emoji: "♻️", color: "#F0F9FF", href: "/products",       order: 6 },
    ],
  },

  // ─── 7. Discover more from Prakash ──────────────────────────────────────────
  {
    key:      "discover-more",
    title:    "Discover more from Prakash",
    subtitle: "Collections and ranges curated just for you",
    type:     "category-tiles",
    order:    7,
    items: [
      { title: "Meal Deals",         subtitle: "Lunch sorted from £3",           emoji: "🥪", color: "#EFF6FF", href: "/categories/food-cupboard",    order: 1 },
      { title: "Healthy Living",     subtitle: "Nutritious and delicious picks",  emoji: "🥗", color: "#F0FDF4", href: "/categories/fresh-food",        order: 2 },
      { title: "World Cuisine",      subtitle: "Flavours from around the globe",  emoji: "🌍", color: "#FFF7ED", href: "/categories/food-cupboard",    order: 3 },
      { title: "Plant-Based",        subtitle: "Vegan & vegetarian favourites",   emoji: "🌱", color: "#F0FDF4", href: "/categories/fresh-food",        order: 4 },
      { title: "Family Favourites",  subtitle: "Everyone will love these",        emoji: "👨‍👩‍👧", color: "#FDF4FF", href: "/categories/treats-snacks",    order: 5 },
      { title: "Student Essentials", subtitle: "Budget-friendly basics",          emoji: "📚", color: "#FEFCE8", href: "/categories/food-cupboard",    order: 6 },
      { title: "British Classics",   subtitle: "Homegrown and handpicked",        emoji: "🇬🇧", color: "#FFF1F2", href: "/categories/food-cupboard",    order: 7 },
      { title: "Summer BBQ",         subtitle: "Fire up the grill",               emoji: "🔥", color: "#FFF7ED", href: "/categories/fresh-food",        order: 8 },
    ],
  },

  // ─── 8. Shop by brand ────────────────────────────────────────────────────────
  {
    key:      "shop-by-brand",
    title:    "Shop by brand",
    subtitle: "Your favourite brands, all in one place",
    type:     "brand-grid",
    order:    8,
    ctaLabel: "All brands",
    ctaHref:  "/categories",
    items: [
      { title: "Heinz",      emoji: "🍅", color: "#C41230", href: "/categories/food-cupboard",  order: 1  },
      { title: "Cadbury",    emoji: "🍫", color: "#7B2D8B", href: "/categories/treats-snacks",  order: 2  },
      { title: "Coca-Cola",  emoji: "🥤", color: "#E61B2A", href: "/categories/drinks",         order: 3  },
      { title: "Walkers",    emoji: "🥔", color: "#003087", href: "/categories/treats-snacks",  order: 4  },
      { title: "Kellogg's",  emoji: "🌾", color: "#D62828", href: "/categories/food-cupboard",  order: 5  },
      { title: "PG Tips",    emoji: "🍵", color: "#00703C", href: "/categories/drinks",         order: 6  },
      { title: "Warburtons", emoji: "🍞", color: "#E87722", href: "/categories/bakery",         order: 7  },
      { title: "Nestlé",     emoji: "☕", color: "#D62828", href: "/categories/treats-snacks",  order: 8  },
      { title: "Andrex",     emoji: "🐶", color: "#F5A800", href: "/categories/household",      order: 9  },
      { title: "Fairy",      emoji: "🫧", color: "#00A9CE", href: "/categories/household",      order: 10 },
      { title: "Quorn",      emoji: "🌿", color: "#4CAF50", href: "/categories/fresh-food",     order: 11 },
      { title: "Hovis",      emoji: "🌾", color: "#8B2500", href: "/categories/bakery",         order: 12 },
    ],
  },

  // ─── 9. Even more to explore ─────────────────────────────────────────────────
  {
    key:      "explore-more",
    title:    "Even more to explore",
    subtitle: "There's always something new to discover at Prakash",
    type:     "explore-cards",
    order:    9,
    items: [
      { title: "Summer BBQ Essentials", subtitle: "Everything for the perfect cookout",   emoji: "🍖", color: "#FFF7ED", href: "/categories/fresh-food",    order: 1 },
      { title: "New Season Arrivals",   subtitle: "Just landed in store this week",        emoji: "✨", color: "#F0F9FF", href: "/products?sortBy=newest",    order: 2 },
      { title: "Budget Buys Under £1",  subtitle: "Great quality at an unbeatable price", emoji: "💰", color: "#F0FDF4", href: "/offers",                    order: 3 },
      { title: "Recipe Kits",           subtitle: "Cook like a pro in 30 minutes",         emoji: "👨‍🍳", color: "#FDF4FF", href: "/categories/food-cupboard", order: 4 },
      { title: "Organic Range",         subtitle: "Better for you and the planet",         emoji: "🌿", color: "#F0FDF4", href: "/categories/fresh-food",    order: 5 },
      { title: "Kids' Lunchbox Picks",  subtitle: "Healthy and fun for little ones",       emoji: "🎒", color: "#FFF1F2", href: "/categories/treats-snacks", order: 6 },
    ],
  },
];

export async function POST() {
  try {
    const { connectDB } = await import("@/lib/db/mongoose");
    await connectDB();
    const model = (await import("@/lib/db/models/homepage-section.model")).default;

    await Promise.all(
      SECTIONS.map((s) =>
        model.updateOne(
          { key: s.key },
          { $set: s },
          { upsert: true }
        )
      )
    );

    return NextResponse.json({
      message: `Seeded ${SECTIONS.length} homepage sections`,
      keys: SECTIONS.map((s) => s.key),
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
