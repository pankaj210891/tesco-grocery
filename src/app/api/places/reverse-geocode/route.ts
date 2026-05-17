import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export type ReverseGeocodeResult = {
  line1:    string;
  line2:    string;
  city:     string;
  postcode: string;
  country:  string;
};

type GeoComponent = {
  long_name:  string;
  short_name: string;
  types:      string[];
};

function pick(components: GeoComponent[], ...types: string[]): string {
  const comp = components.find((c) => types.some((t) => c.types.includes(t)));
  return comp?.long_name ?? "";
}

export async function GET(req: NextRequest) {
  const lat    = req.nextUrl.searchParams.get("lat")?.trim();
  const lng    = req.nextUrl.searchParams.get("lng")?.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!lat || !lng) {
    return Response.json({ success: false, error: "lat and lng are required" }, { status: 400 });
  }

  if (!apiKey) {
    return Response.json(
      { success: false, error: "Google Maps API key not configured" },
      { status: 503 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng",   `${lat},${lng}`);
  url.searchParams.set("key",      apiKey);
  url.searchParams.set("language", "en");

  try {
    const res  = await fetch(url.toString(), { next: { revalidate: 0 } });
    const json = (await res.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        address_components: GeoComponent[];
        geometry: { location: { lat: number; lng: number } };
      }>;
    };

    if (json.status !== "OK" || !json.results.length) {
      return Response.json({ success: false, error: `Geocoding API: ${json.status}` }, { status: 502 });
    }

    // Use the most precise result (first one)
    const comps = json.results[0].address_components;

    const streetNumber = pick(comps, "street_number");
    const route        = pick(comps, "route");
    const sublocality  = pick(comps, "sublocality_level_1", "sublocality");
    const city         = pick(comps, "locality", "postal_town", "administrative_area_level_2");
    const postcode     = pick(comps, "postal_code");
    const country      = pick(comps, "country");

    const line1 = [streetNumber, route].filter(Boolean).join(" ");
    const line2 = sublocality;

    const result: ReverseGeocodeResult = { line1, line2, city, postcode, country };
    return Response.json({ success: true, data: result });
  } catch {
    return Response.json({ success: false, error: "Failed to reach Geocoding API" }, { status: 502 });
  }
}
