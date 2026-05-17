import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export type PlaceDetailsResult = {
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
  return components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? "";
}

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim();
  const apiKey  = process.env.GOOGLE_MAPS_API_KEY;

  if (!placeId) {
    return Response.json({ success: false, error: "placeId is required" }, { status: 400 });
  }
  if (!apiKey) {
    return Response.json({ success: false, error: "Google Maps API key not configured" }, { status: 503 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields",   "address_components");
  url.searchParams.set("key",      apiKey);
  url.searchParams.set("language", "en");

  try {
    const res  = await fetch(url.toString(), { next: { revalidate: 0 } });
    const json = (await res.json()) as {
      status: string;
      result?: { address_components: GeoComponent[] };
    };

    if (json.status !== "OK" || !json.result) {
      return Response.json({ success: false, error: `Places Details API: ${json.status}` }, { status: 502 });
    }

    const comps = json.result.address_components;

    const streetNumber = pick(comps, "street_number");
    const route        = pick(comps, "route");
    const sublocality  = pick(comps, "sublocality_level_1", "sublocality");
    const city         = pick(comps, "locality", "postal_town", "administrative_area_level_2");
    const postcode     = pick(comps, "postal_code");
    const country      = pick(comps, "country");

    const line1 = [streetNumber, route].filter(Boolean).join(" ");
    const line2 = sublocality;

    const data: PlaceDetailsResult = { line1, line2, city, postcode, country };
    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Failed to reach Places Details API" }, { status: 502 });
  }
}
