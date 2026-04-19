/**
 * Linear map from legacy SVG space (viewBox 0..1000 × 0..600) to WGS84.
 * Keeps mock-data + scoring + simulation in SVG units unchanged.
 */

const LNG_W = -125;
const LNG_E = -67;
const LAT_N = 49.5;
const LAT_S = 25.5;

export function svgToLngLat(
  x: number,
  y: number,
): { lng: number; lat: number } {
  const lng = LNG_W + (x / 1000) * (LNG_E - LNG_W);
  const lat = LAT_N - (y / 600) * (LAT_N - LAT_S);
  return { lng, lat };
}

export function lngLatToSvg(
  lng: number,
  lat: number,
): { x: number; y: number } {
  const x = ((lng - LNG_W) / (LNG_E - LNG_W)) * 1000;
  const y = ((LAT_N - lat) / (LAT_N - LAT_S)) * 600;
  return { x, y };
}

/** Default map camera — Arizona / Southwest (matches mock fleet region) */
export const DEFAULT_MAP_VIEW = {
  longitude: -111.35,
  latitude: 33.85,
  zoom: 5.85,
  pitch: 0,
  bearing: 0,
} as const;

export function pickupLngLat(pickupX: number, pickupY: number) {
  return svgToLngLat(pickupX, pickupY);
}
