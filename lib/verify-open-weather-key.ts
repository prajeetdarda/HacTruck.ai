import {
  openWeatherMap2DateSecondsUtc,
  openWeatherMap2TileTemplate,
} from "@/lib/open-weather-tiles";

/**
 * One cheap call so we never mount raster tiles with a rejected key (avoids Mapbox 401 spam).
 */
export async function verifyOpenWeatherApiKey(apiKey: string): Promise<boolean> {
  const k = apiKey.trim();
  if (!k) return false;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=33.45&lon=-112.07&units=metric&appid=${encodeURIComponent(k)}`;
    const res = await fetch(
      url,
      process.env.NODE_ENV === "development"
        ? { cache: "no-store" }
        : { next: { revalidate: 600 } },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Maps 2.0 tiles may 401 even when `data/2.5/weather` succeeds (subscription / product).
 * Probe one tile before wiring scrub-synced URLs in the client.
 */
export async function verifyOpenWeatherMap2TilesWork(
  apiKey: string,
): Promise<boolean> {
  const k = apiKey.trim();
  if (!k) return false;
  const dateSec = openWeatherMap2DateSecondsUtc(Date.now());
  const tileUrl = openWeatherMap2TileTemplate("CL", dateSec, k, 0.5).replace(
    "{z}/{x}/{y}",
    "5/8/12",
  );
  try {
    const res = await fetch(
      tileUrl,
      process.env.NODE_ENV === "development"
        ? { cache: "no-store" }
        : { next: { revalidate: 3600 } },
    );
    return res.ok;
  } catch {
    return false;
  }
}
