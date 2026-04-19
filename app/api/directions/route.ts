import { jsonError, jsonOk } from "@/lib/server/http";

function token(): string | null {
  return (
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    null
  );
}

function parseCoord(name: string, v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (name.endsWith("Lng") && (n < -180 || n > 180)) return null;
  if (name.endsWith("Lat") && (n < -85 || n > 85)) return null;
  return n;
}

/**
 * GET /api/directions?fromLng=&fromLat=&toLng=&toLat=
 * Proxies Mapbox Directions API (driving) and returns GeoJSON LineString coordinates.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromLng = parseCoord("fromLng", searchParams.get("fromLng"));
  const fromLat = parseCoord("fromLat", searchParams.get("fromLat"));
  const toLng = parseCoord("toLng", searchParams.get("toLng"));
  const toLat = parseCoord("toLat", searchParams.get("toLat"));

  if (
    fromLng == null ||
    fromLat == null ||
    toLng == null ||
    toLat == null
  ) {
    return jsonError(
      "Query params fromLng, fromLat, toLng, toLat are required as valid numbers",
      400,
      "VALIDATION",
    );
  }

  const t = token();
  if (!t) {
    return jsonError("Mapbox access token is not configured", 503, "NO_TOKEN");
  }

  const path = `${fromLng},${fromLat};${toLng},${toLat}`;
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${path}`,
  );
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");
  url.searchParams.set("access_token", t);

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), { next: { revalidate: 0 } });
  } catch {
    return jsonError("Directions request failed", 502, "UPSTREAM");
  }

  if (!upstream.ok) {
    return jsonError(
      `Mapbox Directions error (${upstream.status})`,
      502,
      "MAPBOX",
    );
  }

  let body: unknown;
  try {
    body = await upstream.json();
  } catch {
    return jsonError("Invalid JSON from Mapbox", 502, "BAD_UPSTREAM");
  }

  const routes = (body as { routes?: unknown }).routes;
  if (!Array.isArray(routes) || routes.length === 0) {
    return jsonError("No route returned", 404, "NO_ROUTE");
  }

  const geometry = (routes[0] as { geometry?: unknown })?.geometry as
    | { type?: string; coordinates?: unknown }
    | undefined;

  if (
    !geometry ||
    geometry.type !== "LineString" ||
    !Array.isArray(geometry.coordinates)
  ) {
    return jsonError("Unexpected route geometry", 502, "BAD_GEOMETRY");
  }

  const coordinates = geometry.coordinates as [number, number][];
  if (coordinates.length < 2) {
    return jsonError("Route too short", 404, "NO_ROUTE");
  }

  return jsonOk({ coordinates });
}
