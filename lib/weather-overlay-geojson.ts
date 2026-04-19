import type { Feature, FeatureCollection, Point } from "geojson";
import {
  HARDCODED_WEATHER_EVENTS,
  type HardcodedWeatherEvent,
} from "@/lib/hardcoded-weather-events";

const PEAK_OPACITY = 0.3;

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function windowOpacity(
  hoursOffset: number,
  startHour: number,
  endHour: number,
  fadeEdgeHours: number,
): number {
  if (hoursOffset <= startHour || hoursOffset >= endHour) return 0;
  const lo = startHour + fadeEdgeHours;
  const hi = endHour - fadeEdgeHours;
  let envelope = 1;
  if (hoursOffset < lo) {
    envelope = smoothstep01((hoursOffset - startHour) / Math.max(fadeEdgeHours, 1e-6));
  } else if (hoursOffset > hi) {
    envelope = smoothstep01((endHour - hoursOffset) / Math.max(fadeEdgeHours, 1e-6));
  }
  return envelope * PEAK_OPACITY;
}

function interpolateMotion(
  hoursOffset: number,
  keyframes: HardcodedWeatherEvent["motionKeyframes"],
): { dLng: number; dLat: number } {
  if (keyframes.length === 0) return { dLng: 0, dLat: 0 };
  if (hoursOffset <= keyframes[0].hourFromNow) {
    return {
      dLng: keyframes[0].deltaLng,
      dLat: keyframes[0].deltaLat,
    };
  }
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (hoursOffset <= b.hourFromNow) {
      const span = b.hourFromNow - a.hourFromNow;
      const u = span <= 0 ? 0 : (hoursOffset - a.hourFromNow) / span;
      const t = smoothstep01(u);
      return {
        dLng: a.deltaLng + (b.deltaLng - a.deltaLng) * t,
        dLat: a.deltaLat + (b.deltaLat - a.deltaLat) * t,
      };
    }
  }
  const last = keyframes[keyframes.length - 1];
  return { dLng: last.deltaLng, dLat: last.deltaLat };
}

function eventToFeature(
  event: HardcodedWeatherEvent,
  hoursOffset: number,
): Feature<Point> | null {
  const opacity = windowOpacity(
    hoursOffset,
    event.startHour,
    event.endHour,
    event.fadeEdgeHours,
  );
  if (opacity < 0.002) return null;

  const { dLng, dLat } = interpolateMotion(hoursOffset, event.motionKeyframes);
  const lng = event.centerLng + dLng;
  const lat = event.centerLat + dLat;

  return {
    type: "Feature",
    properties: {
      id: event.id,
      kind: event.kind,
      opacity,
    },
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}

/** One point per active cell — drives a single Mapbox `symbol` layer. */
export function buildDemoWeatherIconCollection(
  simulatedHoursOffset: number,
): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];
  for (const event of HARDCODED_WEATHER_EVENTS) {
    const f = eventToFeature(event, simulatedHoursOffset);
    if (f) features.push(f);
  }
  return { type: "FeatureCollection", features };
}
