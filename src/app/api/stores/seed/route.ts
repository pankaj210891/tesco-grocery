import { NextResponse } from "next/server";

const STORES = [
  {
    name: "Prakash Supermarket — Wembley",
    address: "45 High Road",
    city: "Wembley",
    postcode: "HA9 7AB",
    phone: "020 8900 1234",
    email: "wembley@prakashsupermarket.co.uk",
    openingHours: {
      monday:    { open: "07:00", close: "22:00", closed: false },
      tuesday:   { open: "07:00", close: "22:00", closed: false },
      wednesday: { open: "07:00", close: "22:00", closed: false },
      thursday:  { open: "07:00", close: "22:00", closed: false },
      friday:    { open: "07:00", close: "23:00", closed: false },
      saturday:  { open: "07:00", close: "23:00", closed: false },
      sunday:    { open: "09:00", close: "21:00", closed: false },
    },
    amenities: ["Free Parking", "Cafe", "Pharmacy", "ATM", "Click & Collect"],
    isActive: true,
    lat: 51.5528,
    lng: -0.2973,
  },
  {
    name: "Prakash Supermarket — Harrow",
    address: "12 Station Road",
    city: "Harrow",
    postcode: "HA1 2SQ",
    phone: "020 8427 5678",
    email: "harrow@prakashsupermarket.co.uk",
    openingHours: {
      monday:    { open: "07:30", close: "21:00", closed: false },
      tuesday:   { open: "07:30", close: "21:00", closed: false },
      wednesday: { open: "07:30", close: "21:00", closed: false },
      thursday:  { open: "07:30", close: "21:00", closed: false },
      friday:    { open: "07:30", close: "22:00", closed: false },
      saturday:  { open: "08:00", close: "22:00", closed: false },
      sunday:    { open: "10:00", close: "20:00", closed: false },
    },
    amenities: ["Parking", "ATM", "Click & Collect", "Fresh Bakery"],
    isActive: true,
    lat: 51.5799,
    lng: -0.3349,
  },
  {
    name: "Prakash Supermarket — Southall",
    address: "78 The Broadway",
    city: "Southall",
    postcode: "UB1 1LW",
    phone: "020 8574 9012",
    email: "southall@prakashsupermarket.co.uk",
    openingHours: {
      monday:    { open: "06:00", close: "22:00", closed: false },
      tuesday:   { open: "06:00", close: "22:00", closed: false },
      wednesday: { open: "06:00", close: "22:00", closed: false },
      thursday:  { open: "06:00", close: "22:00", closed: false },
      friday:    { open: "06:00", close: "23:00", closed: false },
      saturday:  { open: "06:00", close: "23:00", closed: false },
      sunday:    { open: "08:00", close: "22:00", closed: false },
    },
    amenities: ["Free Parking", "Cafe", "ATM", "Fresh Bakery", "International Foods"],
    isActive: true,
    lat: 51.5117,
    lng: -0.3756,
  },
  {
    name: "Prakash Supermarket — Ealing",
    address: "33 New Broadway",
    city: "Ealing",
    postcode: "W5 2XA",
    phone: "020 8567 3456",
    email: "ealing@prakashsupermarket.co.uk",
    openingHours: {
      monday:    { open: "07:00", close: "22:00", closed: false },
      tuesday:   { open: "07:00", close: "22:00", closed: false },
      wednesday: { open: "07:00", close: "22:00", closed: false },
      thursday:  { open: "07:00", close: "22:00", closed: false },
      friday:    { open: "07:00", close: "22:30", closed: false },
      saturday:  { open: "07:00", close: "22:30", closed: false },
      sunday:    { open: "09:00", close: "20:00", closed: false },
    },
    amenities: ["Parking", "Pharmacy", "ATM", "Click & Collect"],
    isActive: true,
    lat: 51.5130,
    lng: -0.3054,
  },
  {
    name: "Prakash Supermarket — Hayes",
    address: "5 Coldharbour Lane",
    city: "Hayes",
    postcode: "UB3 3EE",
    phone: "020 8561 7890",
    email: "hayes@prakashsupermarket.co.uk",
    openingHours: {
      monday:    { open: "07:00", close: "21:00", closed: false },
      tuesday:   { open: "07:00", close: "21:00", closed: false },
      wednesday: { open: "07:00", close: "21:00", closed: false },
      thursday:  { open: "07:00", close: "21:00", closed: false },
      friday:    { open: "07:00", close: "22:00", closed: false },
      saturday:  { open: "08:00", close: "22:00", closed: false },
      sunday:    { open: "09:00", close: "19:00", closed: false },
    },
    amenities: ["Free Parking", "ATM", "Fresh Bakery"],
    isActive: true,
    lat: 51.5079,
    lng: -0.4199,
  },
  {
    name: "Prakash Supermarket — Greenford",
    address: "120 Greenford Road",
    city: "Greenford",
    postcode: "UB6 0HG",
    phone: "020 8578 2345",
    email: "greenford@prakashsupermarket.co.uk",
    openingHours: {
      monday:    { open: "07:00", close: "21:00", closed: false },
      tuesday:   { open: "07:00", close: "21:00", closed: false },
      wednesday: { open: "07:00", close: "21:00", closed: false },
      thursday:  { open: "07:00", close: "21:00", closed: false },
      friday:    { open: "07:00", close: "22:00", closed: false },
      saturday:  { open: "08:00", close: "22:00", closed: false },
      sunday:    { open: "10:00", close: "18:00", closed: false },
    },
    amenities: ["Parking", "ATM"],
    isActive: true,
    lat: 51.5340,
    lng: -0.3469,
  },
];

export async function POST() {
  try {
    const { connectDB } = await import("@/lib/db/mongoose");
    await connectDB();
    const StoreModel = (await import("@/lib/db/models/store.model")).default;

    await StoreModel.deleteMany({});
    await StoreModel.insertMany(STORES);

    return NextResponse.json({ success: true, message: `Seeded ${STORES.length} stores` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
