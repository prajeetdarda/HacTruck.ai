/**
 * NavPro data loader. Reads the merged bundle at `data/navpro-data.json`
 * (built from the 12 NavPro endpoint snapshots) and exposes typed accessors
 * over fleet drivers, vehicles, tracking, POIs, trips, and routing profiles.
 *
 * Identity convention: NavPro `driver_id` (number, e.g. 36101) is the
 * canonical key for everything in this module. The ELD overlay (5 of 10
 * drivers) is wired in `driver-mapping.ts`, not here — keep this layer
 * agnostic of HOS so the production swap to a live NavPro client is clean.
 */

import fs from "node:fs";
import path from "node:path";

// ---------- Raw bundle types (subset; extend as needed) ----------

type RawTerminalMember = {
  member_id: number;
  member_email: string;
  member_first_name: string;
  member_last_name: string;
  member_phone_number: string;
  member_status: "Active" | "Inactive";
  member_role: string;
};

type RawVehicle = {
  vehicle_id: number;
  owner_id: number;
  owner_name: string;
  vehicle_status: string;
  vehicle_no: string;
  vehicle_type: string;
  vehicle_vin: string;
  gross_vehicle_weight: number;
  trailer_type: string | null;
  vehicle_make: string;
  vehicle_model: string;
  assignments_drivers: {
    driver_ids: number[];
    assign_driver_info: { assign_driver_id: number; assign_driver_name: string }[];
  };
};

type RawTrailPoint = {
  id: number;
  latitude: number;
  longitude: number;
  time: string; // ISO 8601, treat as UTC
};

type RawTracking = {
  driver_id: number;
  trail: RawTrailPoint[];
  active_trip: unknown | null;
};

type RawPerformance = {
  driver_id: number;
  oor_miles: number;
  schedule_miles: number;
  actual_miles: number;
  schedule_time: number;
  actual_time: number;
};

type RawUser = {
  user_id: number;
  user_full_name: string;
  user_email: string;
  user_rank: string;
};

type RawPoi = {
  poi_id: number;
  latitude: number;
  longitude: number;
  external_id: string;
  poi_detail: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
    contact_number: string;
    site_instruction: string;
  };
  site_detail?: unknown;
};

type RawTrip = {
  code: number;
  success: boolean;
  trip_id: string;
  _meta?: { load?: string; scheduled_start_time?: string };
};

type RawDocument = {
  document_id: number;
  document_name: string;
  document_type: string;
  document_url: string;
  upload_by: string;
  upload_date: number;
  file_type: string;
  document_tag: { tag_name: string; related_id: number; related_name: string }[];
  is_private: boolean;
  size: string;
  scope: string;
};

type RawRoutingProfile = {
  id: number;
  name: string;
  truck_ft_length: number;
  truck_in_length: number;
  truck_ft_width: number;
  truck_in_width: number;
  truck_ft_height: number;
  truck_in_height: number;
  weight_limit: number;
  weight_per_axle: number;
  axles: number;
  trailers: number;
  avoid_areas: unknown[];
  avoid_bridges: unknown[];
};

type Bundle = {
  sourceFiles: string[];
  generatedAt: number;
  navProNowMs: number;
  performance: RawPerformance[];
  vehicles: RawVehicle[];
  tracking: RawTracking[];
  documents: RawDocument[];
  terminals: { terminal_id: number; terminal_name: string }[];
  terminalMembers: RawTerminalMember[];
  users: RawUser[];
  pois: RawPoi[];
  trips: RawTrip[];
  routingProfiles: RawRoutingProfile[];
};

// ---------- Public types ----------

export type GpsPoint = { lat: number; lng: number; tsMs: number };

export type FleetDriver = {
  driverId: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  phone: string;
  /** Active drivers are dispatchable; Inactive are filtered by listActiveDrivers(). */
  status: "Active" | "Inactive";
  /** Vehicle assigned to this driver (one-to-one in this fleet). */
  vehicle: VehicleSummary | null;
  /** Latest known position from the tracking trail. null if no pings. */
  lastPosition: GpsPoint | null;
  performance: PerformanceMetrics | null;
};

export type VehicleSummary = {
  vehicleId: number;
  vehicleNo: string;
  make: string;
  model: string;
  vin: string;
  grossWeightLbs: number;
};

export type PerformanceMetrics = {
  oorMiles: number; // out-of-route miles
  scheduleMiles: number;
  actualMiles: number;
  scheduleTimeMin: number;
  actualTimeMin: number;
  /** Convenience flag: > 3mi out-of-route is alert-worthy in the demo. */
  hasSignificantOor: boolean;
};

export type Poi = {
  poiId: number;
  externalId: string;
  position: { lat: number; lng: number };
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  instructions: string;
};

export type Trip = {
  tripId: string;
  /** Best-effort label from the _meta block (e.g. "Load 1 — Dry Van | Phoenix → Mesa"). */
  loadLabel: string | null;
  scheduledStartMs: number | null;
};

export type RoutingProfile = {
  id: number;
  name: string;
  lengthFt: number;
  widthIn: number;
  heightIn: number;
  weightLimitLbs: number;
  axles: number;
  trailers: number;
};

// ---------- Module cache ----------

let cached: Bundle | null = null;
let driversIndex: Map<number, FleetDriver> | null = null;

function load(): Bundle {
  if (cached) return cached;
  const p = path.join(process.cwd(), "data", "navpro-data.json");
  cached = JSON.parse(fs.readFileSync(p, "utf8")) as Bundle;
  return cached;
}

function initials(first: string, last: string): string {
  return `${first.charAt(0) || ""}${last.charAt(0) || ""}`.toUpperCase();
}

function isoToMs(iso: string): number {
  // Tracking timestamps come without timezone; treat as UTC.
  const hasTz = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso);
  return new Date(hasTz ? iso : `${iso}Z`).getTime();
}

function buildVehicleSummary(v: RawVehicle | undefined): VehicleSummary | null {
  if (!v) return null;
  return {
    vehicleId: v.vehicle_id,
    vehicleNo: v.vehicle_no,
    make: v.vehicle_make,
    model: v.vehicle_model,
    vin: v.vehicle_vin,
    grossWeightLbs: v.gross_vehicle_weight,
  };
}

function buildPerformance(p: RawPerformance | undefined): PerformanceMetrics | null {
  if (!p) return null;
  return {
    oorMiles: p.oor_miles,
    scheduleMiles: p.schedule_miles,
    actualMiles: p.actual_miles,
    scheduleTimeMin: p.schedule_time,
    actualTimeMin: p.actual_time,
    hasSignificantOor: p.oor_miles > 3,
  };
}

function buildIndex(): Map<number, FleetDriver> {
  if (driversIndex) return driversIndex;
  const b = load();
  const vehiclesByOwner = new Map(b.vehicles.map((v) => [v.owner_id, v]));
  const perfById = new Map(b.performance.map((p) => [p.driver_id, p]));
  const trackingById = new Map(b.tracking.map((t) => [t.driver_id, t]));

  const out = new Map<number, FleetDriver>();
  for (const m of b.terminalMembers) {
    const t = trackingById.get(m.member_id);
    const lastTrail = t?.trail?.[t.trail.length - 1];
    const lastPosition: GpsPoint | null = lastTrail
      ? {
          lat: lastTrail.latitude,
          lng: lastTrail.longitude,
          tsMs: isoToMs(lastTrail.time),
        }
      : null;

    out.set(m.member_id, {
      driverId: m.member_id,
      email: m.member_email,
      firstName: m.member_first_name,
      lastName: m.member_last_name,
      fullName: `${m.member_first_name} ${m.member_last_name}`,
      initials: initials(m.member_first_name, m.member_last_name),
      phone: m.member_phone_number,
      status: m.member_status,
      vehicle: buildVehicleSummary(vehiclesByOwner.get(m.member_id)),
      lastPosition,
      performance: buildPerformance(perfById.get(m.member_id)),
    });
  }
  driversIndex = out;
  return out;
}

// ---------- Public API ----------

/** Anchor "now" for NavPro data: latest tracking ping across all drivers. */
export function getNavProNow(): number {
  return load().navProNowMs;
}

export function listFleetDrivers(): FleetDriver[] {
  return Array.from(buildIndex().values());
}

export function listActiveDrivers(): FleetDriver[] {
  return listFleetDrivers().filter((d) => d.status === "Active");
}

export function getFleetDriver(driverId: number): FleetDriver | null {
  return buildIndex().get(driverId) ?? null;
}

/**
 * Position at-or-before `atTs`. The mock has 1–3 pings per driver; with no
 * `atTs` you get the most recent. With `atTs` we return the latest ping
 * not exceeding it (caller can extrapolate forward for simulated time).
 */
export function getDriverPosition(
  driverId: number,
  atTs?: number,
): GpsPoint | null {
  const t = load().tracking.find((x) => x.driver_id === driverId);
  if (!t || t.trail.length === 0) return null;
  const points = t.trail
    .map((p) => ({ lat: p.latitude, lng: p.longitude, tsMs: isoToMs(p.time) }))
    .sort((a, b) => a.tsMs - b.tsMs);
  if (atTs == null) return points[points.length - 1]!;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]!.tsMs <= atTs) return points[i]!;
  }
  return points[0]!;
}

export function getDriverTrail(driverId: number): GpsPoint[] {
  const t = load().tracking.find((x) => x.driver_id === driverId);
  if (!t) return [];
  return t.trail
    .map((p) => ({ lat: p.latitude, lng: p.longitude, tsMs: isoToMs(p.time) }))
    .sort((a, b) => a.tsMs - b.tsMs);
}

export function listPois(): Poi[] {
  return load().pois.map((p) => ({
    poiId: p.poi_id,
    externalId: p.external_id,
    position: { lat: p.latitude, lng: p.longitude },
    street: p.poi_detail.street,
    city: p.poi_detail.city,
    state: p.poi_detail.state,
    zip: p.poi_detail.zip_code,
    phone: p.poi_detail.contact_number,
    instructions: p.poi_detail.site_instruction,
  }));
}

export function getPoiByExternalId(externalId: string): Poi | null {
  return listPois().find((p) => p.externalId === externalId) ?? null;
}

export function listTrips(): Trip[] {
  return load().trips.map((t) => ({
    tripId: t.trip_id,
    loadLabel: t._meta?.load ?? null,
    scheduledStartMs: t._meta?.scheduled_start_time
      ? isoToMs(t._meta.scheduled_start_time)
      : null,
  }));
}

export function listRoutingProfiles(): RoutingProfile[] {
  return load().routingProfiles.map((r) => ({
    id: r.id,
    name: r.name,
    lengthFt: r.truck_ft_length + r.truck_in_length / 12,
    widthIn: r.truck_ft_width * 12 + r.truck_in_width,
    heightIn: r.truck_ft_height * 12 + r.truck_in_height,
    weightLimitLbs: r.weight_limit,
    axles: r.axles,
    trailers: r.trailers,
  }));
}

/** Documents tagged to a specific driver. */
export function listDocumentsForDriver(driverId: number): RawDocument[] {
  return load().documents.filter((d) =>
    d.document_tag.some(
      (t) => t.tag_name === "driver" && t.related_id === driverId,
    ),
  );
}
