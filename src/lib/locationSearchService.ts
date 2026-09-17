// Free, keyless place search for bus/cab pickup-drop fields — the app's mobile
// build uses paid Google Places for this; ponytail: OpenStreetMap/Nominatim
// covers the same "type -> suggestions -> pick" flow with no API key or billing,
// swap for Google Places later if exact parity/quality becomes a requirement.
export interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
}

interface NominatimHit {
  display_name: string;
  lat: string;
  lon: string;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=in&q=${encodeURIComponent(trimmed)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];

  const data = (await res.json()) as NominatimHit[];
  return data.map((hit) => ({
    label: hit.display_name,
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
  }));
}
