/**
 * Transforms the raw API fixture files in /files/ into the Driver[] and Load[]
 * shapes the app expects.
 *
 * Sources used:
 *   00b_drivers_query_response    → names, work_status, addresses
 *   00c_driver_performance_response → actual drive time + OOR miles → HOS, lane familiarity, CPM
 *   01_vehicles_query_response    → truck make/model → truckLabel + equipment type hint
 *   02_tracking_driver_dispatch   → real GPS trails → SVG x/y positions
 *   06_poi_query_response         → real pickup lat/lng for loads 1 & 4
 *   07_trip_create_response       → load routes, equipment types, scheduled times
 */

import driversRaw from "../files/00b_drivers_query_response.json";
import perfRaw from "../files/00c_driver_performance_response.json";
import vehiclesRaw from "../files/01_vehicles_query_response.json";
import trackingRaw from "../files/02_tracking_driver_dispatch_response.json";
import { lngLatToSvg } from "./geo-bridge";
import type { Driver, DriverRingStatus, EquipmentType, Load } from "./types";

export const FLEET_NAME = "Desert Sun Logistics";

const now = Date.now();

// --- index helpers ---

const perfById = Object.fromEntries(perfRaw.data.map((p) => [p.driver_id, p]));

const vehicleByOwner = Object.fromEntries(
  vehiclesRaw.data.map((v) => [v.owner_id, v]),
);

const trailById = Object.fromEntries(
  trackingRaw.data.map((t) => [t.driver_id, t.trail]),
);

// --- field derivations ---

/**
 * CDL endorsements and truck model → equipment type.
 *
 * Kenworth T680 / W900 are classic flatbed haulers in this fleet.
 * N (tanker) or X (tanker+hazmat) → reefer (closest type the app supports).
 * T (doubles) without a tanker endorsement → flatbed.
 * Default → dry_van.
 */
function toEquipment(endorsements: string[], model: string): EquipmentType {
  if (model === "T680" || model === "W900") return "flatbed";
  if (endorsements.includes("N") || endorsements.includes("X")) return "reefer";
  if (endorsements.includes("T")) return "flatbed";
  return "dry_van";
}

/**
 * work_status + HOS remaining → ring status.
 * Multiply drive time by 1.2 to approximate total on-duty time (not just wheels-rolling).
 */
function toRingStatus(workStatus: string, hos: number): DriverRingStatus {
  if (workStatus === "INACTIVE") return "off_duty";
  if (hos <= 0) return "unavailable";
  if (hos < 3) return "constrained";
  return "available";
}

function deriveHos(workStatus: string, actualTimeMin: number): number {
  if (workStatus === "INACTIVE") return 0;
  const raw = 11 - (actualTimeMin / 60) * 1.2;
  return Math.round(Math.max(0, raw) * 10) / 10;
}

function deriveLaneFamiliarity(oorMiles: number, actualMiles: number): number {
  if (actualMiles <= 0) return 50;
  return Math.max(0, Math.min(100, Math.round((1 - oorMiles / actualMiles) * 100)));
}

function deriveCostPerMile(oorMiles: number, actualMiles: number): number {
  if (actualMiles <= 0) return 1.85;
  const ratio = oorMiles / actualMiles;
  return Math.round((1.7 + ratio * 0.5) * 100) / 100;
}

// --- DRIVERS ---

export const DRIVERS: Driver[] = driversRaw.data.map((d) => {
  const perf = perfById[d.driver_id] ?? {
    oor_miles: 0,
    actual_miles: 0,
    actual_time: 0,
  };
  const vehicle = vehicleByOwner[d.driver_id];
  const trail = trailById[d.driver_id] ?? [];

  // Latest GPS point → SVG position
  const latest = trail[trail.length - 1];
  const pos = latest
    ? lngLatToSvg(latest.longitude, latest.latitude)
    : lngLatToSvg(-111.9916, 33.4484); // fallback: Phoenix HQ

  const hos = deriveHos(d.basic_info.work_status, perf.actual_time);
  const ringStatus = toRingStatus(d.basic_info.work_status, hos);

  const endorsements = d.license_detail_info.endorsements;
  const model = vehicle?.vehicle_model ?? "";
  const make = vehicle?.vehicle_make ?? "";
  const equipment = toEquipment(endorsements, model);

  const equipLabel =
    equipment === "dry_van" ? "Dry" : equipment === "reefer" ? "Reefer" : "Flatbed";
  const truckLabel =
    make && model
      ? `${make} ${model} · ${equipLabel}`
      : `${d.basic_info.assignments_vehicles.truck?.vehicle_no ?? "Unknown"} · ${equipLabel}`;

  const first = d.basic_info.driver_first_name;
  const last = d.basic_info.driver_last_name;

  return {
    id: `d${d.driver_id}`,
    name: `${first} ${last}`,
    initials: `${first[0]}${last[0]}`,
    x: Math.round(pos.x),
    y: Math.round(pos.y),
    ringStatus,
    equipment,
    truckLabel,
    hosRemainingHours: hos,
    hosMaxHours: 11,
    laneHistoryCount: Math.round(perf.actual_miles / 10),
    costPerMile: deriveCostPerMile(perf.oor_miles, perf.actual_miles),
    laneFamiliarity: deriveLaneFamiliarity(perf.oor_miles, perf.actual_miles),
  };
});

// --- LOADS ---
// Routes from 07_trip_create_response, pickup coords from 06_poi_query_response.
// Deadlines are relative to app start time so the demo always has urgency.

const loadDefs: {
  id: string;
  origin: string;
  destination: string;
  equipment: EquipmentType;
  revenue: number;
  pickupLat: number;
  pickupLng: number;
  deadlineOffsetMs: number;
}[] = [
  {
    // trip 20260418-1: Dry Van | Phoenix → Mesa
    id: "L-1001",
    origin: "Phoenix, AZ",
    destination: "Mesa, AZ",
    equipment: "dry_van",
    revenue: 2800,
    pickupLat: 33.4822,
    pickupLng: -112.0167, // POI 701002 — 1220 N 48th St
    deadlineOffsetMs: 2 * 60 * 60 * 1000,
  },
  {
    // trip 20260418-2: Reefer | Phoenix → Chandler
    id: "L-1002",
    origin: "Phoenix, AZ",
    destination: "Chandler, AZ",
    equipment: "reefer",
    revenue: 3200,
    pickupLat: 33.4484,
    pickupLng: -111.9916, // Phoenix HQ (POI 701001)
    deadlineOffsetMs: 1.5 * 60 * 60 * 1000,
  },
  {
    // trip 20260418-3: Flatbed | South Phoenix → North Phoenix
    id: "L-1003",
    origin: "South Phoenix, AZ",
    destination: "North Phoenix, AZ",
    equipment: "flatbed",
    revenue: 2100,
    pickupLat: 33.37,
    pickupLng: -112.076,
    deadlineOffsetMs: 4 * 60 * 60 * 1000,
  },
  {
    // trip 20260418-4: Tanker (→ dry_van) | Surprise → Goodyear
    id: "L-1004",
    origin: "Surprise, AZ",
    destination: "Goodyear, AZ",
    equipment: "dry_van",
    revenue: 1800,
    pickupLat: 33.6411,
    pickupLng: -112.3682, // POI 701004 — 16801 N Litchfield Rd
    deadlineOffsetMs: 0.5 * 60 * 60 * 1000,
  },
];

export const LOADS: Load[] = loadDefs.map((def) => {
  const pickupPos = lngLatToSvg(def.pickupLng, def.pickupLat);
  return {
    id: def.id,
    origin: def.origin,
    destination: def.destination,
    equipment: def.equipment,
    revenue: def.revenue,
    pickupDeadline: now + def.deadlineOffsetMs,
    pickupX: Math.round(pickupPos.x),
    pickupY: Math.round(pickupPos.y),
  };
});
