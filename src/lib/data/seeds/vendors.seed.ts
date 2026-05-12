/**
 * Vendor seed documents — 15 vendors with pre-assigned ObjectIds.
 * ownerId references USER_IDS from ids.ts (U11–U20 are vendor-role users,
 * U01 is admin; U02–U10 are customers).
 */

import { VENDOR_IDS, VENDOR_NAMES, USER_IDS, USER_NAMES, type VendorKey } from "./ids";

export interface VendorSeed {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: "active" | "pending" | "suspended";
  ownerId: string;
  ownerName: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function logo(hex: string, label: string): string {
  const l = encodeURIComponent(label.slice(0, 18).replace(/\s+/g, "+"));
  return `https://placehold.co/200x200/${hex}/FFFFFF?text=${l}`;
}

type RawVendor = {
  key: VendorKey;
  desc: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  colour: string;
  ownerKey: keyof typeof USER_IDS;
  status?: "active" | "pending" | "suspended";
};

const RAW: RawVendor[] = [
  {
    key:      "RAJ_FRESH_FARMS",
    desc:     "Family-run farm supplying the freshest seasonal fruits, vegetables and salads direct from Raj's fields in Hertfordshire.",
    email:    "hello@rajfreshfarms.co.uk",
    phone:    "01582 441 001",
    address:  "Raj Farm, Luton Road",
    city:     "Harpenden",
    colour:   "22c55e",
    ownerKey: "U11",
    status:   "active",
  },
  {
    key:      "GOLDEN_CRUST",
    desc:     "Artisan bakery crafting sourdough loaves, pastries and celebration cakes every morning using heritage grain flours.",
    email:    "orders@goldencrustbakery.co.uk",
    phone:    "020 8456 2201",
    address:  "12 Baker Street",
    city:     "Wembley",
    colour:   "f59e0b",
    ownerKey: "U12",
    status:   "active",
  },
  {
    key:      "DAIRY_BELLE",
    desc:     "Award-winning dairy co-operative supplying organic milk, butter, cheese and yogurt from free-range British farms.",
    email:    "info@dairybelle.co.uk",
    phone:    "01234 567 003",
    address:  "Dairy Belle Creamery, Farm Lane",
    city:     "Bedford",
    colour:   "a3e635",
    ownerKey: "U13",
    status:   "active",
  },
  {
    key:      "OCEAN_PASTURE",
    desc:     "Specialists in ethically sourced British meats and sustainably caught seafood, delivered fresh daily.",
    email:    "trade@oceanpasture.co.uk",
    phone:    "01273 884 004",
    address:  "Fish Dock, Harbour Road",
    city:     "Brighton",
    colour:   "0ea5e9",
    ownerKey: "U14",
    status:   "active",
  },
  {
    key:      "SIP_REFRESH",
    desc:     "Premium drinks wholesaler stocking soft drinks, craft beers, wines, cordials and non-alcoholic alternatives.",
    email:    "trade@siprefresh.co.uk",
    phone:    "020 7123 5005",
    address:  "Unit 7, Beverage Park",
    city:     "Ealing",
    colour:   "a855f7",
    ownerKey: "U15",
    status:   "active",
  },
  {
    key:      "CRUNCH_MUNCH",
    desc:     "Nationwide snack distributor carrying all the UK's favourite crisps, chocolates, biscuits and confectionery brands.",
    email:    "sales@crunchmunch.co.uk",
    phone:    "0121 456 7006",
    address:  "Snack Warehouse, Industrial Estate",
    city:     "Birmingham",
    colour:   "f97316",
    ownerKey: "U16",
    status:   "active",
  },
  {
    key:      "POLAR_ICE",
    desc:     "Cold-chain specialists delivering premium frozen ready meals, ice cream, frozen vegetables and convenience foods.",
    email:    "orders@polaricefoods.co.uk",
    phone:    "01908 334 007",
    address:  "Cold Store, Logistics Park",
    city:     "Milton Keynes",
    colour:   "06b6d4",
    ownerKey: "U17",
    status:   "active",
  },
  {
    key:      "PURE_EARTH",
    desc:     "Certified organic supplier of whole foods, superfoods, protein supplements and natural pantry staples.",
    email:    "hello@pureearthorganics.co.uk",
    phone:    "0117 987 8008",
    address:  "8 Green Lane",
    city:     "Bristol",
    colour:   "4ade80",
    ownerKey: "U18",
    status:   "active",
  },
  {
    key:      "WORLD_KITCHEN",
    desc:     "International grocery specialists bringing authentic ingredients from over 40 cuisines — from Italian pasta to Asian sauces.",
    email:    "info@worldkitchenhub.co.uk",
    phone:    "020 3456 9009",
    address:  "19 Globe Terrace",
    city:     "Southall",
    colour:   "fbbf24",
    ownerKey: "U19",
    status:   "active",
  },
  {
    key:      "CLEAN_HOME",
    desc:     "Eco-conscious household products brand offering cleaning, laundry and personal care essentials that are kind to the planet.",
    email:    "trade@cleanhomeessentials.co.uk",
    phone:    "0161 789 0010",
    address:  "Unit 3, Clean Park",
    city:     "Manchester",
    colour:   "6b7280",
    ownerKey: "U20",
    status:   "active",
  },
  {
    key:      "TECH_ZONE",
    desc:     "Authorised electronics retailer and importer stocking leading tech brands — cables, smart home, gaming and accessories.",
    email:    "sales@techzone.co.uk",
    phone:    "020 8900 1100",
    address:  "21 Silicon Way",
    city:     "Hayes",
    colour:   "3b82f6",
    ownerKey: "U11",
    status:   "active",
  },
  {
    key:      "STYLE_STUDIO",
    desc:     "Contemporary fashion label and accessories brand offering everyday basics, seasonal collections and sustainable essentials.",
    email:    "hello@stylestudio.co.uk",
    phone:    "020 7654 1200",
    address:  "5 Fashion Lane",
    city:     "Harrow",
    colour:   "f43f5e",
    ownerKey: "U12",
    status:   "active",
  },
  {
    key:      "PLAY_WORLD",
    desc:     "Toy and games specialists carrying major brands — LEGO, Hasbro, Ravensburger, Schleich and more for all ages.",
    email:    "orders@playworldtoys.co.uk",
    phone:    "01923 665 1300",
    address:  "Toy Warehouse, Commerce Park",
    city:     "Watford",
    colour:   "ef4444",
    ownerKey: "U13",
    status:   "active",
  },
  {
    key:      "GARDEN_PRO",
    desc:     "Garden centre and DIY supplier covering tools, plant food, seeds, pest control, car care and outdoor accessories.",
    email:    "info@gardenpro.co.uk",
    phone:    "01753 889 1400",
    address:  "Garden Pro Nursery, Bath Road",
    city:     "Slough",
    colour:   "16a34a",
    ownerKey: "U14",
    status:   "active",
  },
  {
    key:      "HEALTH_PLUS",
    desc:     "Health and wellness distributor specialising in vitamins, supplements, baby care, beauty and pharmacy essentials.",
    email:    "trade@healthplusdist.co.uk",
    phone:    "020 8765 1500",
    address:  "Health House, Wellbeing Road",
    city:     "Greenford",
    colour:   "d946ef",
    ownerKey: "U15",
    status:   "active",
  },
];

export const VENDOR_SEEDS: VendorSeed[] = RAW.map((r) => ({
  _id:       VENDOR_IDS[r.key],
  name:      VENDOR_NAMES[r.key],
  slug:      slugify(VENDOR_NAMES[r.key]),
  description: r.desc,
  logo:      logo(r.colour, VENDOR_NAMES[r.key]),
  email:     r.email,
  phone:     r.phone,
  address:   r.address,
  city:      r.city,
  status:    r.status ?? "active",
  ownerId:   USER_IDS[r.ownerKey],
  ownerName: USER_NAMES[r.ownerKey],
}));
