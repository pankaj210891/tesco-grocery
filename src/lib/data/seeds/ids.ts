/**
 * Pre-assigned 24-hex ObjectId strings for cross-seed referential integrity.
 * All seed files import from here so vendor/user references stay consistent
 * no matter which collection is seeded first.
 */

// ─── Vendors ─────────────────────────────────────────────────────────────────

export const VENDOR_IDS = {
  RAJ_FRESH_FARMS:  "65ab0001000000000000aa01",
  GOLDEN_CRUST:     "65ab0001000000000000aa02",
  DAIRY_BELLE:      "65ab0001000000000000aa03",
  OCEAN_PASTURE:    "65ab0001000000000000aa04",
  SIP_REFRESH:      "65ab0001000000000000aa05",
  CRUNCH_MUNCH:     "65ab0001000000000000aa06",
  POLAR_ICE:        "65ab0001000000000000aa07",
  PURE_EARTH:       "65ab0001000000000000aa08",
  WORLD_KITCHEN:    "65ab0001000000000000aa09",
  CLEAN_HOME:       "65ab0001000000000000aa0a",
  TECH_ZONE:        "65ab0001000000000000aa0b",
  STYLE_STUDIO:     "65ab0001000000000000aa0c",
  PLAY_WORLD:       "65ab0001000000000000aa0d",
  GARDEN_PRO:       "65ab0001000000000000aa0e",
  HEALTH_PLUS:      "65ab0001000000000000aa0f",
} as const;

export type VendorKey = keyof typeof VENDOR_IDS;

export const VENDOR_NAMES: Record<VendorKey, string> = {
  RAJ_FRESH_FARMS:  "Raj Fresh Farms",
  GOLDEN_CRUST:     "Golden Crust Bakery",
  DAIRY_BELLE:      "Dairy Belle Co.",
  OCEAN_PASTURE:    "Ocean & Pasture",
  SIP_REFRESH:      "Sip & Refresh",
  CRUNCH_MUNCH:     "Crunch & Munch Snacks",
  POLAR_ICE:        "Polar Ice Foods",
  PURE_EARTH:       "Pure Earth Organics",
  WORLD_KITCHEN:    "World Kitchen Hub",
  CLEAN_HOME:       "CleanHome Essentials",
  TECH_ZONE:        "Tech Zone",
  STYLE_STUDIO:     "Style Studio",
  PLAY_WORLD:       "Play World",
  GARDEN_PRO:       "Garden Pro",
  HEALTH_PLUS:      "Health Plus",
};

// ─── Customer Users ───────────────────────────────────────────────────────────

export const USER_IDS = {
  U01: "66bb0001000000000000bb01",
  U02: "66bb0001000000000000bb02",
  U03: "66bb0001000000000000bb03",
  U04: "66bb0001000000000000bb04",
  U05: "66bb0001000000000000bb05",
  U06: "66bb0001000000000000bb06",
  U07: "66bb0001000000000000bb07",
  U08: "66bb0001000000000000bb08",
  U09: "66bb0001000000000000bb09",
  U10: "66bb0001000000000000bb0a",
  U11: "66bb0001000000000000bb0b",
  U12: "66bb0001000000000000bb0c",
  U13: "66bb0001000000000000bb0d",
  U14: "66bb0001000000000000bb0e",
  U15: "66bb0001000000000000bb0f",
  U16: "66bb0001000000000000bb10",
  U17: "66bb0001000000000000bb11",
  U18: "66bb0001000000000000bb12",
  U19: "66bb0001000000000000bb13",
  U20: "66bb0001000000000000bb14",
} as const;

export type UserKey = keyof typeof USER_IDS;

export const USER_NAMES: Record<UserKey, string> = {
  U01: "Priya Sharma",
  U02: "Rahul Mehta",
  U03: "Ananya Singh",
  U04: "Vikram Patel",
  U05: "Deepa Nair",
  U06: "Arjun Kapoor",
  U07: "Meera Joshi",
  U08: "Rohan Gupta",
  U09: "Sunita Rao",
  U10: "Kiran Malhotra",
  U11: "Neha Verma",
  U12: "Aditya Kumar",
  U13: "Pooja Iyer",
  U14: "Sanjay Reddy",
  U15: "Kavya Nair",
  U16: "Manish Sharma",
  U17: "Riya Patel",
  U18: "Suresh Menon",
  U19: "Divya Krishnan",
  U20: "Aryan Malhotra",
};

export const USER_EMAILS: Record<UserKey, string> = {
  U01: "priya.sharma@example.com",
  U02: "rahul.mehta@example.com",
  U03: "ananya.singh@example.com",
  U04: "vikram.patel@example.com",
  U05: "deepa.nair@example.com",
  U06: "arjun.kapoor@example.com",
  U07: "meera.joshi@example.com",
  U08: "rohan.gupta@example.com",
  U09: "sunita.rao@example.com",
  U10: "kiran.malhotra@example.com",
  U11: "neha.verma@example.com",
  U12: "aditya.kumar@example.com",
  U13: "pooja.iyer@example.com",
  U14: "sanjay.reddy@example.com",
  U15: "kavya.nair@example.com",
  U16: "manish.sharma@example.com",
  U17: "riya.patel@example.com",
  U18: "suresh.menon@example.com",
  U19: "divya.krishnan@example.com",
  U20: "aryan.malhotra@example.com",
};
