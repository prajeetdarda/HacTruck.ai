/**
 * OpenWeather raster tiles for the map.
 *
 * - **Maps 2.0** — `date` (Unix UTC, 3h steps) for forecast/historical sync with timeline scrub.
 *   @see https://openweathermap.org/api/weather-map-2
 * - **Maps 1.0** — legacy PNG; no `date`; near-current only (fallback when Maps 2.0 is unavailable).
 *   @see https://openweathermap.org/api/weathermaps
 */

const OWM_TILE_V1 = "https://tile.openweathermap.org/map";
const OWM_MAP2_BASE = "https://maps.openweathermap.org/maps/2.0/weather";

/** Historical maps available since (UTC). */
const OWM_MAP2_HISTORY_START_MS = Date.UTC(2019, 2, 18, 0, 0, 0);

/** Forecast window per Weather maps 2.0 docs (use conservative bound). */
const OWM_MAP2_FORECAST_MAX_DAYS = 10;

/**
 * Clamp simulated instant to a range OpenWeather Maps 2.0 accepts for `date`
 * (historical since Mar 2019, forecast within ~10 days of `nowMs`).
 */
export function clampSimulatedMsForOwmMap2(
  simulatedMs: number,
  nowMs: number,
): number {
  const maxMs = nowMs + OWM_MAP2_FORECAST_MAX_DAYS * 24 * 60 * 60 * 1000;
  return Math.min(
    maxMs,
    Math.max(OWM_MAP2_HISTORY_START_MS, simulatedMs),
  );
}

/** OWM rounds `date` to the previous 3-hour interval (UTC). */
export function openWeatherMap2DateSecondsUtc(simulatedMs: number): number {
  const STEP_MS = 3 * 60 * 60 * 1000;
  const floored = Math.floor(simulatedMs / STEP_MS) * STEP_MS;
  return Math.floor(floored / 1000);
}

/** Maps 2.0 `{z}/{x}/{y}` template for Mapbox `raster` sources. */
export function openWeatherMap2TileTemplate(
  op: "CL" | "PR0",
  dateSecUtc: number,
  apiKey: string,
  urlOpacity: number,
): string {
  const q = new URLSearchParams({
    date: String(dateSecUtc),
    opacity: String(urlOpacity),
    appid: apiKey.trim(),
  });
  return `${OWM_MAP2_BASE}/${op}/{z}/{x}/{y}?${q.toString()}`;
}

/** Classic `{z}/{x}/{y}` raster URL (no forecast time). */
export function openWeatherLegacyTileTemplate(
  layer: "clouds_new" | "precipitation_new",
  apiKey: string,
): string {
  const q = new URLSearchParams({ appid: apiKey.trim() });
  return `${OWM_TILE_V1}/${layer}/{z}/{x}/{y}.png?${q.toString()}`;
}
