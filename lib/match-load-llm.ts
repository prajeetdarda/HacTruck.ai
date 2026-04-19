import {
  DRIVERS,
  DB_NOW_MS,
  getLoad,
  IN_TRANSIT_LOADS,
  listAlerts,
  TRIPS,
  VEHICLES,
} from "./backend-db";
import { extractFeatures, rankDriversForLoad } from "./scoring";
import type { Load } from "./types";

/** Serializable snapshot for the LLM + API route. */
export function buildMatchLoadPayload(loadId: string) {
  const load = getLoad(loadId);
  if (!load) return null;

  const ranked = rankDriversForLoad(load, DRIVERS);
  const featuresRows = ranked.map((r) => ({
    driverId: r.driver.id,
    name: r.driver.name,
    matchPercent: r.matchPercent,
    score: r.score,
    rejectTags: r.rejectTags,
    features: extractFeatures(load, r.driver),
  }));

  return {
    referenceTimeMs: DB_NOW_MS,
    load: {
      id: load.id,
      origin: load.origin,
      destination: load.destination,
      equipment: load.equipment,
      revenue: load.revenue,
      pickupDeadline: load.pickupDeadline,
    },
    drivers: DRIVERS.map((d) => ({
      id: d.id,
      name: d.name,
      equipment: d.equipment,
      ringStatus: d.ringStatus,
      hosRemainingHours: d.hosRemainingHours,
      hosMaxHours: d.hosMaxHours,
      laneHistoryCount: d.laneHistoryCount,
      costPerMile: d.costPerMile,
      laneFamiliarity: d.laneFamiliarity,
      truckLabel: d.truckLabel,
      currentLoadEndingInHours: d.currentLoadEndingInHours ?? null,
      hasActiveConflict: d.hasActiveConflict ?? false,
      mapX: d.x,
      mapY: d.y,
    })),
    vehicles: VEHICLES.map((v) => ({
      vehicleNo: v.vehicleNo,
      driverId: v.driverId,
      make: v.make,
      model: v.model,
      equipment: v.equipment,
      status: v.status,
    })),
    trips: TRIPS.map((t) => ({
      tripId: t.tripId,
      loadId: t.loadId,
      driverId: t.driverId,
      vehicleNo: t.vehicleNo,
      status: t.status,
      oorMiles: t.oorMiles,
      scheduleMiles: t.scheduleMiles,
      actualMiles: t.actualMiles,
    })),
    inTransitLoadIds: IN_TRANSIT_LOADS.map((l) => l.id),
    alerts: listAlerts(0).map((a) => ({
      alertId: a.alertId,
      severity: a.severity,
      headline: a.headline,
      driverId: a.driverId,
      vehicleNo: a.vehicleNo,
      loadId: a.loadId,
      etaImpactMinutes: a.etaImpactMinutes,
      acknowledged: a.acknowledged,
    })),
    heuristicRankedPreview: featuresRows.slice(0, 8),
  };
}

export type MatchLoadPayload = NonNullable<ReturnType<typeof buildMatchLoadPayload>>;

export function heuristicTopThreeForLoad(load: Load) {
  return rankDriversForLoad(load, DRIVERS).slice(0, 3);
}
