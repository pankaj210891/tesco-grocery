import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export type PlacesSuggestion = {
  placeId:     string;
  description: string;
  mainText:    string;
  secondaryText: string;
};

export async function GET(req: NextRequest) {
  const input   = req.nextUrl.searchParams.get("input")?.trim() ?? "";
  const apiKey  = process.env.GOOGLE_MAPS_API_KEY;

  if (!input || input.length < 3) {
    return Response.json({ success: true, data: [] });
  }

  if (!apiKey) {
    return Response.json(
      { success: false, error: "Google Maps API key not configured" },
      { status: 503 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input",    input);
  url.searchParams.set("key",      apiKey);
  url.searchParams.set("language", "en");

  try {
    const res  = await fetch(url.toString(), { next: { revalidate: 0 } });
    const json = (await res.json()) as {
      status: string;
      predictions: Array<{
        place_id: string;
        description: string;
        structured_formatting: {
          main_text:      string;
          secondary_text: string;
        };
      }>;
    };

    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      return Response.json({ success: false, error: `Places API: ${json.status}` }, { status: 502 });
    }

    const data: PlacesSuggestion[] = (json.predictions ?? []).map((p) => ({
      placeId:       p.place_id,
      description:   p.description,
      mainText:      p.structured_formatting?.main_text      ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
    }));

    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Failed to reach Places API" }, { status: 502 });
  }
}
