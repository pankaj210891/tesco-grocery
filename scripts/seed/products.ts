/**
 * Product generation engine.
 *
 * Defines one GroupTemplate per level-0 category (18 real + 3 meta skipped).
 * generateProducts() produces 10 realistic products per level-2 category
 * by combining brand × adjective × format using the template pool.
 *
 * Exports: GROUP_TEMPLATES, generateProducts(), seedProducts()
 */

import mongoose from "mongoose";
import ProductModel from "../../src/lib/db/models/product.model";
import { VENDOR_IDS, VENDOR_NAMES, type VendorKey } from "../../src/lib/data/seeds/ids";
import {
  toSlug, genSku, toINR, generateVariants, randomBadge, makeTags, makeDescription,
  rand, randFloat, chance, pick,
  type VariantStrategy,
} from "./helpers";
import { type L0Entry } from "./categories";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendorRef { id: string; name: string }

interface L1Override {
  brands?:     string[];
  adjectives?: string[];
}

interface GroupTemplate {
  vendors: VendorRef[];
  brands: string[];
  adjectives: string[];
  formats: string[];
  priceRange: [number, number]; // GBP
  units: string[];
  variantStrategy: VariantStrategy;
  deliveryOptions: Array<"express" | "standard" | "collection">;
  organicBoost?: boolean;
  attributes?: Record<string, string[]>;
  /** Per-L1-name brand/adjective overrides so products feel category-specific */
  l1Overrides?: Record<string, L1Override>;
}

const V = (key: VendorKey): VendorRef => ({ id: VENDOR_IDS[key], name: VENDOR_NAMES[key] });

// ─── 18 Group templates (one per seeded level-0 category) ────────────────────

export const GROUP_TEMPLATES: Record<string, GroupTemplate> = {

  "fresh-food": {
    vendors: [V("RAJ_FRESH_FARMS"), V("DAIRY_BELLE"), V("OCEAN_PASTURE")],
    brands: ["Prakash Farms", "British Select", "Finest", "Organic Choice", "Seasonal Select",
             "Farm Fresh", "Field & Harvest", "Nature's Pick", "British Growers", "Riverford"],
    adjectives: ["Organic", "Free Range", "British", "Premium", "Fresh", "Seasonal", "Farm Fresh", "Hand-Picked"],
    formats: ["250g", "400g", "500g", "1kg", "pack of 4", "pack of 6", "per bunch", "each"],
    priceRange: [0.45, 9.00],
    units: ["each", "per 500g", "per bunch", "per pack", "per 250g"],
    variantStrategy: "weight",
    deliveryOptions: ["express", "standard"],
    organicBoost: true,
    attributes: { organic: ["yes", "no"], weight: ["250g", "500g", "1kg"] },
    l1Overrides: {
      "Vegetables": {
        brands:     ["Riverford", "Abel & Cole", "British Growers", "Organic Choice", "Field & Harvest",
                     "Tesco Finest", "Nature's Pick", "Seasonal Select", "Farm Fresh", "Prakash Farms"],
        adjectives: ["Organic", "British", "Farm Fresh", "Seasonal", "Hand-Picked", "Locally Grown"],
      },
      "Fruits": {
        brands:     ["Driscoll's", "Berry Gardens", "Del Monte", "Chiquita", "Nature's Best",
                     "British Grown", "Organic Choice", "Seasonal Harvest", "Field Fresh", "Premium Select"],
        adjectives: ["Ripe", "Organic", "Seasonal", "Juicy", "Hand-Picked", "Premium", "British"],
      },
      "Dairy & Eggs": {
        brands:     ["Anchor", "Cathedral City", "Chobani", "Happy Hens", "Yeo Valley",
                     "Lurpak", "Cravendale", "Arla", "Kerrygold", "Waitrose Duchy"],
        adjectives: ["Organic", "Free Range", "Full Fat", "Low Fat", "Mature", "Extra Mature", "Creamy"],
      },
      "Meat & Poultry": {
        brands:     ["Moy Park", "Cranswick", "British Select", "Waitrose Duchy", "Pilgrim's Pride",
                     "Cobble Lane", "Finnebrogue", "Hereford Beef", "Aberdeen Angus", "Prakash Farms"],
        adjectives: ["Free Range", "British", "Organic", "Extra Lean", "Premium", "Slow-Matured", "Outdoor Bred"],
      },
      "Fish & Seafood": {
        brands:     ["Ocean Bounty", "Scottish Select", "Young's", "Princes", "John West",
                     "Loch Fyne", "Bakkafrost", "Scottish Salmon Co.", "Seafood Scotland", "M&S Select"],
        adjectives: ["Scottish", "Wild-Caught", "Sustainably Sourced", "Fresh", "Premium", "Hand-Filleted", "Smoked"],
      },
    },
  },

  "bakery": {
    vendors: [V("GOLDEN_CRUST")],
    brands: ["Warburtons", "Hovis", "Kingsmill", "Golden Crust", "Greggs", "Roberts",
             "Genius", "Soreen", "Artisan Bakes", "Village Bakery"],
    adjectives: ["Artisan", "Freshly Baked", "Classic", "Wholegrain", "Premium", "Traditional", "Soft", "Crusty"],
    formats: ["400g", "800g", "pack of 4", "pack of 6", "each", "500g loaf", "2 pack"],
    priceRange: [0.75, 4.50],
    units: ["each", "loaf", "pack of 4", "pack of 6", "per 400g"],
    variantStrategy: "none",
    deliveryOptions: ["standard", "collection"],
  },

  "frozen-food": {
    vendors: [V("POLAR_ICE")],
    brands: ["Birds Eye", "McCain", "Iceland", "Aunt Bessie's", "Ben & Jerry's",
             "Findus", "Young's", "Goodfella's", "Dr. Oetker", "Richmond"],
    adjectives: ["Premium", "Classic", "Original", "Crispy", "Stone Baked", "Thick", "Chunky", "Creamy"],
    formats: ["300g", "400g", "500g", "750g", "1kg", "2 pack", "4 pack", "900ml"],
    priceRange: [1.00, 10.00],
    units: ["per 300g", "per 400g", "per 500g", "per kg", "per pack"],
    variantStrategy: "size",
    deliveryOptions: ["standard"],
    l1Overrides: {
      "Ice Cream & Desserts": {
        brands:     ["Ben & Jerry's", "Häagen-Dazs", "Carte D'Or", "Magnolia", "Walls",
                     "Feasting Fox", "Gü", "Yeo Valley", "Dr. Oetker", "Green & Black's"],
        adjectives: ["Creamy", "Indulgent", "Premium", "Double", "Classic", "No Added Sugar"],
      },
      "Frozen Meals": {
        brands:     ["Birds Eye", "Goodfella's", "Dr. Oetker", "Iceland", "Aunt Bessie's",
                     "Charlie Bigham's", "Cook", "Tesco Finest", "Wicked Kitchen", "Cauldron"],
        adjectives: ["Premium", "Classic", "Stone Baked", "Slow Cooked", "Homestyle", "Creamy"],
      },
      "Frozen Meat & Fish": {
        brands:     ["Birds Eye", "Young's", "Findus", "Richmond", "Wall's",
                     "Quorn", "Heck", "Naked", "Just Cook", "Tesco Finest"],
        adjectives: ["Chunky", "Thick-Cut", "Crispy", "Battered", "Marinated", "Grilled"],
      },
    },
  },

  "treats-snacks": {
    vendors: [V("CRUNCH_MUNCH"), V("PURE_EARTH")],
    brands: ["Walkers", "Pringles", "Cadbury", "Haribo", "McVitie's", "Kettle",
             "Doritos", "KitKat", "Rowntree's", "Nakd", "Trek", "Graze"],
    adjectives: ["Original", "Sharing", "Multipack", "Limited Edition", "Classic", "Jumbo", "Mini"],
    formats: ["30g", "150g", "175g pack", "200g", "sharing bag 180g", "6 pack", "12 pack", "tin"],
    priceRange: [0.55, 4.50],
    units: ["per bag", "per pack", "per tin", "multipack"],
    variantStrategy: "flavor",
    deliveryOptions: ["standard"],
  },

  "food-cupboard": {
    vendors: [V("WORLD_KITCHEN"), V("PURE_EARTH")],
    brands: ["Heinz", "Napolina", "Baxters", "Dolmio", "Hellmann's", "Kikkoman",
             "Lee Kum Kee", "Cirio", "Clearspring", "Seeds of Change", "Tilda"],
    adjectives: ["Premium", "Classic", "Organic", "Extra Virgin", "Low Sugar", "Traditional", "Rich"],
    formats: ["400g tin", "500g", "700ml jar", "1L bottle", "2 pack", "3 pack", "1kg bag"],
    priceRange: [0.85, 8.50],
    units: ["per jar", "per tin", "per bottle", "per kg", "per pack"],
    variantStrategy: "weight",
    deliveryOptions: ["standard"],
    organicBoost: true,
  },

  "drinks": {
    vendors: [V("SIP_REFRESH")],
    brands: ["Coca-Cola", "Pepsi", "Evian", "Highland Spring", "Twinings",
             "Nescafé", "Tropicana", "Innocent", "Fever-Tree", "Lipton",
             "BrewDog", "Strathmore", "Costa Coffee", "Tetley"],
    adjectives: ["Original", "Diet", "Zero Sugar", "Natural", "Sparkling", "Chilled", "Classic", "Premium"],
    formats: ["330ml can", "500ml bottle", "1L", "1.5L", "2L", "6-pack cans", "box of 80", "12 pods"],
    priceRange: [0.65, 18.00],
    units: ["per can", "per bottle", "per litre", "per box", "per pack"],
    variantStrategy: "volume",
    deliveryOptions: ["standard"],
  },

  "health-beauty": {
    vendors: [V("HEALTH_PLUS"), V("PURE_EARTH")],
    brands: ["Olay", "L'Oréal Paris", "Nivea", "Dove", "Pantene",
             "Vitabiotics", "Holland & Barrett", "Simple", "Cetaphil", "Head & Shoulders",
             "Herbal Essences", "TRESemmé", "Boots", "Bioderma"],
    adjectives: ["Pro-V", "Moisturising", "Deep Cleanse", "Anti-Dandruff", "Brightening",
                 "Nourishing", "Vitamin-Enriched", "24hr Protection", "SPF 50"],
    formats: ["50ml", "100ml", "200ml", "400ml", "500ml", "30 tablets", "60 capsules", "90 capsules"],
    priceRange: [1.80, 45.00],
    units: ["per bottle", "per tube", "per pack", "per pot", "per capsules"],
    variantStrategy: "volume",
    deliveryOptions: ["standard"],
  },

  "household": {
    vendors: [V("CLEAN_HOME")],
    brands: ["Fairy", "Flash", "Dettol", "Ariel", "Bold",
             "Lenor", "Cillit Bang", "Domestos", "Mr Muscle", "Method",
             "Ecover", "Zoflora", "Febreze", "Duck"],
    adjectives: ["Original", "Power", "Anti-Bacterial", "Bio", "Non-Bio", "Eco", "Ultra", "Concentrated"],
    formats: ["500ml", "750ml", "1L", "3L", "4-pack", "box of 24", "100 sheets", "40 washes"],
    priceRange: [1.00, 12.00],
    units: ["per bottle", "per pack", "per roll", "per box", "per washes"],
    variantStrategy: "volume",
    deliveryOptions: ["standard"],
  },

  "baby-toddler": {
    vendors: [V("HEALTH_PLUS")],
    brands: ["Pampers", "Huggies", "Aptamil", "Cow & Gate", "Ella's Kitchen",
             "Heinz Baby", "Sudocrem", "Johnson's Baby", "WaterWipes", "Tommee Tippee"],
    adjectives: ["Sensitive", "Premium", "Organic", "Gentle", "Extra Soft", "Newborn",
                 "Active Fit", "Night", "Ultra Dry"],
    formats: ["pack of 30", "pack of 52", "pack of 80", "400g", "4 x 100g", "500ml", "200g tub"],
    priceRange: [1.50, 28.00],
    units: ["per pack", "per pouch", "per tin", "per tub", "per bottle"],
    variantStrategy: "size",
    deliveryOptions: ["standard"],
  },

  "pets": {
    vendors: [V("PURE_EARTH"), V("WORLD_KITCHEN")],
    brands: ["Pedigree", "Whiskas", "Royal Canin", "Purina", "Felix",
             "Go-Cat", "Bakers", "Bob Martin", "James Wellbeloved", "Lily's Kitchen"],
    adjectives: ["Premium", "Complete", "Natural", "Organic", "Grain Free", "Senior", "Kitten",
                 "Puppy", "Adult", "Sensitive"],
    formats: ["400g", "800g", "1.5kg", "3kg", "7.5kg", "12 pack", "per pouch", "2kg bag"],
    priceRange: [1.20, 55.00],
    units: ["per bag", "per pouch", "per tin", "per pack"],
    variantStrategy: "weight",
    deliveryOptions: ["standard"],
  },

  "home-furniture": {
    vendors: [V("CLEAN_HOME"), V("TECH_ZONE")],
    brands: ["Dunelm", "Silentnight", "Habitat", "Argos Home", "Tefal",
             "Tower", "KitchenCraft", "Wilko", "Utopia Bedding", "Catherine Lansfield"],
    adjectives: ["Premium", "Luxury", "Essential", "Contemporary", "Classic", "Ergonomic",
                 "Non-Stick", "Stainless Steel", "Brushed"],
    formats: ["single", "double", "king", "each", "set of 2", "set of 4", "pair", "3-piece set"],
    priceRange: [5.00, 180.00],
    units: ["each", "per pair", "per set", "per pack"],
    variantStrategy: "color",
    deliveryOptions: ["standard"],
  },

  "electronics-gaming": {
    vendors: [V("TECH_ZONE")],
    brands: ["Samsung", "Sony", "LG", "Apple", "Philips", "JBL",
             "Anker", "Logitech", "Microsoft", "Razer", "Bose", "Jabra",
             "Kingston", "SanDisk", "Epson"],
    adjectives: ["Pro", "Ultra", "Elite", "4K", "Wireless", "Noise-Cancelling",
                 "Fast Charge", "Smart", "HD", "Portable"],
    formats: ["each", "bundle", "with accessories", "starter kit", "refurbished"],
    priceRange: [15.00, 1200.00],
    units: ["each", "per unit"],
    variantStrategy: "storage",
    deliveryOptions: ["standard"],
    attributes: {
      ram: ["4GB", "8GB", "12GB", "16GB", "32GB"],
      storage: ["64GB", "128GB", "256GB", "512GB", "1TB"],
      network: ["Wi-Fi", "4G", "5G"],
      processor: ["Snapdragon 695", "A16 Bionic", "MediaTek Dimensity", "Intel Core i5", "Apple M2"],
      battery: ["3000mAh", "4500mAh", "5000mAh", "6000mAh"],
    },
  },

  "clothing-accessories": {
    vendors: [V("STYLE_STUDIO")],
    brands: ["Style Studio", "M&S", "Next", "F&F", "George",
             "H&M Basics", "Uniqlo-Style", "Primark Picks", "JD Sports", "Yours Clothing"],
    adjectives: ["Classic", "Slim Fit", "Relaxed", "Premium", "Organic Cotton",
                 "Everyday", "Essential", "Tailored", "Stretch"],
    formats: ["each", "2-pack", "3-pack", "bundle of 5", "multipack"],
    priceRange: [4.00, 95.00],
    units: ["each", "per pair", "per pack"],
    variantStrategy: "size",
    deliveryOptions: ["standard"],
  },

  "toys-games": {
    vendors: [V("PLAY_WORLD")],
    brands: ["LEGO", "Hasbro", "Mattel", "Ravensburger", "Playmobil",
             "Fisher-Price", "Hot Wheels", "Play-Doh", "Orchard Toys", "Schleich"],
    adjectives: ["Classic", "Deluxe", "Jumbo", "Mini", "Creative", "Educational",
                 "Limited Edition", "Collector's"],
    formats: ["each", "set", "starter pack", "expansion", "deluxe edition", "value pack"],
    priceRange: [4.00, 95.00],
    units: ["each", "per set", "per pack"],
    variantStrategy: "color",
    deliveryOptions: ["standard"],
  },

  "sports-leisure": {
    vendors: [V("STYLE_STUDIO"), V("TECH_ZONE")],
    brands: ["Nike", "Adidas", "Under Armour", "Puma", "Speedo",
             "Decathlon", "Columbia", "The North Face Basics", "New Balance", "Casall"],
    adjectives: ["Pro", "Performance", "Lightweight", "Ultra", "Breathable",
                 "Reflective", "Waterproof", "Compression", "Ergonomic"],
    formats: ["each", "pair", "set of 2", "set of 3", "value pack"],
    priceRange: [4.50, 180.00],
    units: ["each", "per pair", "per set"],
    variantStrategy: "size",
    deliveryOptions: ["standard"],
  },

  "garden-diy-car": {
    vendors: [V("GARDEN_PRO")],
    brands: ["Miracle-Gro", "Roundup", "Castrol", "Turtle Wax", "WD-40",
             "Bosch", "Stanley", "Karcher", "Scotts", "Wilko"],
    adjectives: ["Professional", "Heavy Duty", "Concentrate", "Fast-Acting",
                 "All-Season", "Eco", "Premium", "Long Lasting"],
    formats: ["500ml", "1L", "5L", "each", "pack of 2", "set", "500g bag", "1kg"],
    priceRange: [2.00, 140.00],
    units: ["per bottle", "per can", "per bag", "each", "per set"],
    variantStrategy: "volume",
    deliveryOptions: ["standard"],
  },

  "hobbies-stationery": {
    vendors: [V("PLAY_WORLD")],
    brands: ["Winsor & Newton", "Crayola", "Staedtler", "Bic", "Post-it",
             "Moleskine", "Oxford", "Faber-Castell", "Daler-Rowney", "Clairefontaine"],
    adjectives: ["Professional", "Artist Grade", "Premium", "Deluxe", "Everyday",
                 "Classic", "Value", "Essential"],
    formats: ["each", "set of 12", "pack of 10", "set of 24", "box", "A4 pad", "A5 pad"],
    priceRange: [1.50, 55.00],
    units: ["each", "per set", "per pack", "per pad"],
    variantStrategy: "color",
    deliveryOptions: ["standard"],
  },

  "parties-seasonal": {
    vendors: [V("PLAY_WORLD"), V("CRUNCH_MUNCH")],
    brands: ["Amscan", "Hallmark", "Clinton Cards", "Party Packs", "Talking Tables",
             "Neviti", "PartyDeco", "Meri Meri"],
    adjectives: ["Deluxe", "Giant", "Mini", "Foil", "Biodegradable",
                 "Premium", "Personalised", "Jumbo"],
    formats: ["pack of 10", "pack of 20", "each", "set", "bundle", "pack of 6", "per roll"],
    priceRange: [0.99, 24.00],
    units: ["per pack", "each", "per set", "per roll"],
    variantStrategy: "color",
    deliveryOptions: ["standard", "collection"],
  },
};

// ─── Meta categories (no products) ───────────────────────────────────────────

const NO_SEED_SLUGS = new Set(["marketplace", "kiosk", "inspiration-events"]);

// ─── Product generator ────────────────────────────────────────────────────────

const PRODUCTS_PER_L2 = 10;

function buildAttributes(
  l0Slug: string,
  tpl: GroupTemplate,
  idx: number
): Record<string, string> | undefined {
  if (l0Slug === "electronics-gaming" && tpl.attributes) {
    const attrs = tpl.attributes;
    return {
      ram:       pick(attrs.ram!),
      storage:   pick(attrs.storage!),
      network:   pick(attrs.network!),
      processor: attrs.processor![idx % attrs.processor!.length],
      battery:   pick(attrs.battery!),
    };
  }
  if (l0Slug === "fresh-food" && tpl.attributes) {
    return { organic: chance(0.3) ? "yes" : "no" };
  }
  if (l0Slug === "food-cupboard" && tpl.attributes) {
    return { organic: chance(0.2) ? "yes" : "no" };
  }
  return undefined;
}

function makeDelivery(
  tpl: GroupTemplate,
  priceGBP: number
): Array<"express" | "standard" | "collection"> {
  if (tpl.deliveryOptions.includes("express") && priceGBP > 2 && chance(0.5)) {
    return ["express", "standard"];
  }
  return tpl.deliveryOptions;
}

export function generateProducts(
  l2Name: string,
  l2Slug: string,
  l0Slug: string,
  l0Name: string,
  counter: { n: number },
  l1Name?: string,
): Record<string, unknown>[] {
  const tpl = GROUP_TEMPLATES[l0Slug];
  if (!tpl) return [];

  // Apply L1-level overrides when available
  const override = l1Name ? (tpl.l1Overrides?.[l1Name] ?? {}) : {};

  const products: Record<string, unknown>[] = [];
  const brands     = override.brands     ?? tpl.brands;
  const adjectives = override.adjectives ?? tpl.adjectives;
  const { formats, priceRange, units, variantStrategy } = tpl;

  for (let i = 0; i < PRODUCTS_PER_L2; i++) {
    const brand = brands[i % brands.length];
    const adj   = chance(0.55) ? adjectives[i % adjectives.length] : "";
    const fmt   = formats[i % formats.length];

    const nameParts = [brand, adj, l2Name, fmt].filter(Boolean);
    const productName = nameParts.join(" ");

    const basePriceGBP = randFloat(priceRange[0], priceRange[1]);
    const hasDiscount  = chance(0.42);
    const origGBP      = hasDiscount ? basePriceGBP * randFloat(1.1, 1.38) : null;
    const inStock      = chance(0.88);
    const vendor       = pick(tpl.vendors);

    genSku(counter, "PROD"); // increments counter.n used by slugBase
    const slugBase = `${toSlug(productName)}-${counter.n}`;

    const variants = generateVariants(variantStrategy, basePriceGBP, counter);

    const attrs = buildAttributes(l0Slug, tpl, i);

    products.push({
      name:           productName,
      slug:           slugBase,
      description:    makeDescription(productName, brand, l2Name, i),
      price:          toINR(basePriceGBP),
      ...(origGBP ? { originalPrice: toINR(origGBP) } : {}),
      images:         [],
      category:       l0Name,
      subcategory:    l2Name,
      brand,
      unit:           units[i % units.length],
      inStock,
      stockQuantity:  inStock ? (chance(0.65) ? rand(8, 450) : null) : 0,
      lowStockThreshold: 5,
      rating:         parseFloat(randFloat(3.2, 5.0).toFixed(1)),
      reviewCount:    rand(3, 850),
      tags:           makeTags(productName, l2Name),
      badge:          randomBadge(tpl.organicBoost),
      deliveryOptions: makeDelivery(tpl, basePriceGBP),
      vendorId:       new mongoose.Types.ObjectId(vendor.id),
      vendorName:     vendor.name,
      status:         "approved",
      ...(attrs ? { attributes: attrs } : {}),
      variants,
    });
  }

  return products;
}

// ─── Seeder ───────────────────────────────────────────────────────────────────

const BATCH_SIZE = 200;

export async function seedProducts(tree: L0Entry[]): Promise<number> {
  const counter = { n: 0 };
  let totalInserted = 0;
  let batch: Record<string, unknown>[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await ProductModel.insertMany(batch, { ordered: false });
    totalInserted += batch.length;
    batch = [];
  };

  for (const l0 of tree) {
    if (NO_SEED_SLUGS.has(l0.slug)) continue;

    for (const l1 of l0.children) {
      for (const [l2Name] of l1.children) {
        const l2Slug = toSlug(`${toSlug(`${l0.slug}-${l1.name}`)}-${l2Name}`);
        const products = generateProducts(l2Name, l2Slug, l0.slug, l0.name, counter, l1.name);
        batch.push(...products);

        if (batch.length >= BATCH_SIZE) await flush();
      }
    }

    process.stdout.write(`   ✓ ${l0.name} (${l0.children.length * l0.children[0].children.length * PRODUCTS_PER_L2} products)\n`);
  }

  await flush();
  return totalInserted;
}
