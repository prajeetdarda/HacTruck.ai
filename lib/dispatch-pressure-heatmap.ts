import type { Feature, FeatureCollection, Point } from "geojson";
import { svgToLngLat } from "@/lib/geo-bridge";
import { distanceMiles } from "@/lib/scoring";
import type { Driver, Load } from "@/lib/types";

/** Miles: below this min distance, demand pressure is ~0 (well covered). */
const DEMAND_NEAR_MI = 100;
/** Miles span for ramping demand weight after DEMAND_NEAR_MI. */
const DEMAND_RAMP_MI = 260;
/** Miles: below this, supply (idle) pressure low vs open loads. */
const SUPPLY_NEAR_MI = 125;
const SUPPLY_RAMP_MI = 300;
/** Drop features with combined weight below this (balanced / noise). */
const WEIGHT_FLOOR = 0.05;
/** When no open loads, soft blue weight at each idle driver. */
const STRANDED_SUPPLY_W = 0.35;

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function isIdleCapacity(d: Driver): boolean {
  return d.ringStatus === "good" || d.ringStatus === "watch";
}

/**
 * Higher when pickup is soon (simulated wall clock + offset).
 * Capped so the heatmap stays readable.
 */
function urgencyMultiplier(hoursToDeadline: number): number {
  if (hoursToDeadline <= 0) return 1.35;
  if (hoursToDeadline < 2) return 1.2;
  if (hoursToDeadline < 6) return 1.05 + (6 - hoursToDeadline) * 0.025;
  if (hoursToDeadline < 18) return 1;
  if (hoursToDeadline < 48) return 0.55 + (0.45 * (48 - hoursToDeadline)) / 30;
  return clamp(0.2 + 0.35 * Math.exp(-(hoursToDeadline - 48) / 36), 0.15, 0.55);
}

/**
 * Point features for Mapbox heatmap: `kind` demand | supply, `w` weight 0–1+.
 */
export function buildPressureHeatmapGeoJSON(
  openLoads: Load[],
  drivers: Driver[],
  nowMs: number,
  offsetHours: number,
): FeatureCollection {
  const simNow = nowMs + offsetHours * 3600000;
  const features: Feature<Point>[] = [];

  const idleDrivers = drivers.filter(isIdleCapacity);

  for (const load of openLoads) {
    const eligible = idleDrivers.filter((d) => d.equipment === load.equipment);
    const hoursToDeadline = (load.pickupDeadline - simNow) / 3600000;
    const urgency = urgencyMultiplier(hoursToDeadline);

    let baseW: number;
    if (eligible.length === 0) {
      baseW = 1;
    } else {
      let dMin = Infinity;
      for (const d of eligible) {
        const mi = distanceMiles(d.x, d.y, load.pickupX, load.pickupY);
        if (mi < dMin) dMin = mi;
      }
      baseW = clamp((dMin - DEMAND_NEAR_MI) / DEMAND_RAMP_MI, 0, 1);
    }

    const w = clamp(baseW * urgency, 0, 1.5);
    if (w < WEIGHT_FLOOR) continue;

    const { lng, lat } = svgToLngLat(load.pickupX, load.pickupY);
    features.push({
      type: "Feature",
      properties: { kind: "demand" as const, w },
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }

  if (openLoads.length === 0) {
    for (const d of idleDrivers) {
      const { lng, lat } = svgToLngLat(d.x, d.y);
      features.push({
        type: "Feature",
        properties: { kind: "supply" as const, w: STRANDED_SUPPLY_W },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }
  } else {
    for (const d of idleDrivers) {
      const matchedLoads = openLoads.filter((l) => l.equipment === d.equipment);
      if (matchedLoads.length === 0) {
        const w = 0.42;
        if (w < WEIGHT_FLOOR) continue;
        const { lng, lat } = svgToLngLat(d.x, d.y);
        features.push({
          type: "Feature",
          properties: { kind: "supply" as const, w },
          geometry: { type: "Point", coordinates: [lng, lat] },
        });
        continue;
      }
      let dMinLoad = Infinity;
      for (const load of matchedLoads) {
        const mi = distanceMiles(d.x, d.y, load.pickupX, load.pickupY);
        if (mi < dMinLoad) dMinLoad = mi;
      }
      const w = clamp((dMinLoad - SUPPLY_NEAR_MI) / SUPPLY_RAMP_MI, 0, 1);
      if (w < WEIGHT_FLOOR) continue;
      const { lng, lat } = svgToLngLat(d.x, d.y);
      features.push({
        type: "Feature",
        properties: { kind: "supply" as const, w },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }
  }

  return { type: "FeatureCollection", features };
}
