/**
 * HacTruck backend dummy database — single source of truth.
 *
 * Built from the reference responses under `poorvi_data_files/` (Desert Sun
 * Logistics fleet, API shape) and the ELD mock workbook under
 * `anjali_data_files/` (HOS events / malfunctions schema). All geography is
 * constrained to Arizona to match the az511 integration.
 *
 * Two read paths the frontend cares about:
 *   1. getLoadRecommendations(loadId) — ranked drivers + comparison matrix
 *   2. listAlerts() / getAlertDetail(alertId) — proactive alerts on in-transit
 *      trucks with enough context to drop into a dispatcher detail view.
 *
 * Timestamps anchor to the current UTC calendar day so a live demo reads as
 * “today” / “tomorrow.” Restart the dev server to roll to the next day.
 */

import type {
  Driver,
  Load,
  Trip,
  TruckAlert,
  TruckAlertDetail,
  Vehicle,
  LoadRecommendation,
} from "./types";
import { lngLatToSvg, svgToLngLat } from "./geo-bridge";
import { rankDriversForLoad, shortAiReason } from "./scoring";

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

export const FLEET_NAME = "Desert Sun Logistics";
export const TERMINAL = {
  id: 45700,
  name: "Desert Sun Logistics — Phoenix Hub",
  lat: 33.4484,
  lng: -111.9916,
} as const;

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function utcStartOfTodayMs(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0, 0);
}

/** Midnight UTC for the current calendar day — trip pings and alerts sit on this day. */
const DEMO_DAY_START_MS = utcStartOfTodayMs();

/**
 * Demo “now”: same calendar day, 18:00 UTC (~11:00 America/Phoenix).
 * Open-board pickup deadlines are a few hours from this instant.
 */
export const DB_NOW_MS = DEMO_DAY_START_MS + 18 * HOUR;

/** YYYYMMDD for trip IDs, matching the demo calendar day (UTC). */
const TRIP_DAY_ID = (() => {
  const d = new Date(DEMO_DAY_START_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
})();

/** AZ + nearby hubs — reused for driver pins, load pickups, and trip trails. */
const AZ = {
  casaGrande: { lat: 32.8795, lng: -111.7574 },
  tucson: { lat: 32.2226, lng: -110.9747 },
  sierraVista: { lat: 31.5545, lng: -110.3037 },
  flagstaff: { lat: 35.1983, lng: -111.6513 },
  page: { lat: 36.9147, lng: -111.4558 },
  yuma: { lat: 32.6927, lng: -114.6277 },
  lakeHavasu: { lat: 34.4839, lng: -114.3225 },
  prescott: { lat: 34.5401, lng: -112.4685 },
  wickenburg: { lat: 33.9686, lng: -112.7475 },
  kingman: { lat: 35.1894, lng: -114.0531 },
  nogales: { lat: 31.3404, lng: -110.9343 },
  winslow: { lat: 35.0242, lng: -110.6974 },
  showLow: { lat: 34.2544, lng: -110.0287 },
  holbrook: { lat: 34.9028, lng: -110.0051 },
  stGeorge: { lat: 37.0965, lng: -113.5684 },
} as const;

function xy(lng: number, lat: number) {
  const p = lngLatToSvg(lng, lat);
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

/* ------------------------------------------------------------------ */
/* Vehicles (from 01_vehicles_query_response.json)                      */
/* ------------------------------------------------------------------ */

export const VEHICLES: Vehicle[] = [
  { vehicleId: 72201, vehicleNo: "DSL-Truck-01", driverId: "36101", vin: "1HTMKAAR5GH401221", make: "International", model: "ProStar",  grossWeightLbs: 80000, equipment: "dry_van", type: "truck", status: "ACTIVE" },
  { vehicleId: 72202, vehicleNo: "DSL-Truck-02", driverId: "36102", vin: "3HSDJAPR7GN523491", make: "Freightliner",  model: "Cascadia", grossWeightLbs: 80000, equipment: "reefer",  type: "truck", status: "ACTIVE" },
  { vehicleId: 72203, vehicleNo: "DSL-Truck-03", driverId: "36103", vin: "1FUJGBDV4CLBP1184", make: "Kenworth",      model: "T680",     grossWeightLbs: 80000, equipment: "dry_van", type: "truck", status: "ACTIVE" },
  { vehicleId: 72204, vehicleNo: "DSL-Truck-04", driverId: "36104", vin: "1XKYDP9X2KJ388041", make: "Peterbilt",     model: "579",      grossWeightLbs: 80000, equipment: "flatbed", type: "truck", status: "ACTIVE" },
  { vehicleId: 72205, vehicleNo: "DSL-Truck-05", driverId: "36105", vin: "3HSDJAPR5JN801223", make: "Freightliner",  model: "Cascadia", grossWeightLbs: 80000, equipment: "dry_van", type: "truck", status: "ACTIVE" },
  { vehicleId: 72206, vehicleNo: "DSL-Truck-06", driverId: "36106", vin: "1NPXGGEJ4GD254810", make: "Volvo",         model: "VNL 860",  grossWeightLbs: 80000, equipment: "reefer",  type: "truck", status: "ACTIVE" },
  { vehicleId: 72207, vehicleNo: "DSL-Truck-07", driverId: "36107", vin: "1FUJGHDV8DLBX3819", make: "Kenworth",      model: "W900",     grossWeightLbs: 80000, equipment: "dry_van", type: "truck", status: "ACTIVE" },
  { vehicleId: 72208, vehicleNo: "DSL-Truck-08", driverId: "36108", vin: "1HTMKAAN0GH201998", make: "International", model: "LT",       grossWeightLbs: 54000, equipment: "flatbed", type: "truck", status: "ACTIVE" },
  { vehicleId: 72209, vehicleNo: "DSL-Truck-09", driverId: "36109", vin: "3AKJGLD57GSGS2218", make: "Mack",          model: "Anthem",   grossWeightLbs: 80000, equipment: "dry_van", type: "truck", status: "INACTIVE" },
  { vehicleId: 72210, vehicleNo: "DSL-Truck-10", driverId: "36110", vin: "1FUJGHDR6CLBY9044", make: "Peterbilt",     model: "389",      grossWeightLbs: 80000, equipment: "reefer",  type: "truck", status: "MAINTENANCE" },
];

/* ------------------------------------------------------------------ */
/* Drivers                                                              */
/*                                                                      */
/* Seeded from 00b_drivers_query_response.json (identity + last-known   */
/* location). HOS / lane stats derived from 00c_driver_performance and  */
/* plausible values for the demo. Ring status reflects current trips.   */
/* ------------------------------------------------------------------ */

type DriverSeed = {
  id: string;
  first: string;
  last: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  truckLabel: string;
  equipment: Driver["equipment"];
  ringStatus: Driver["ringStatus"];
  hosRemainingHours: number;
  laneHistoryCount: number;
  costPerMile: number;
  laneFamiliarity: number;
  currentLoadEndingInHours?: number;
  enRouteThrough?: { lat: number; lng: number }[];
  hasActiveConflict?: boolean;
};

const DRIVER_SEEDS: DriverSeed[] = [
  { id: "36101", first: "Marcus",  last: "Webb",     city: "Tucson, AZ",           lat: 32.251,  lng: -110.947,  phone: "520-555-0114", email: "marcus.webb@desertsunlog.com",    truckLabel: "International ProStar · Dry",    equipment: "dry_van", ringStatus: "en_route",    hosRemainingHours: 7.4, laneHistoryCount: 42, costPerMile: 1.82, laneFamiliarity: 88, currentLoadEndingInHours: 1.6, enRouteThrough: [AZ.tucson, AZ.casaGrande] },
  { id: "36102", first: "Rosa",    last: "Delgado",  city: "Yuma, AZ",             lat: 32.718,  lng: -114.618, phone: "928-555-0227", email: "rosa.delgado@desertsunlog.com",   truckLabel: "Freightliner Cascadia · Reefer", equipment: "reefer",  ringStatus: "en_route",    hosRemainingHours: 5.8, laneHistoryCount: 31, costPerMile: 1.95, laneFamiliarity: 72, currentLoadEndingInHours: 2.1, enRouteThrough: [AZ.yuma, AZ.lakeHavasu] },
  { id: "36103", first: "Jake",    last: "Torres",   city: "Flagstaff, AZ",        lat: 35.204,  lng: -111.651, phone: "928-555-0339", email: "jake.torres@desertsunlog.com",    truckLabel: "Kenworth T680 · Dry",            equipment: "dry_van", ringStatus: "available",   hosRemainingHours: 9.8, laneHistoryCount: 48, costPerMile: 1.79, laneFamiliarity: 85 },
  { id: "36104", first: "Anita",   last: "Pham",     city: "Show Low, AZ",         lat: 34.263,  lng: -110.035, phone: "928-555-0441", email: "anita.pham@desertsunlog.com",     truckLabel: "Peterbilt 579 · Flatbed",        equipment: "flatbed", ringStatus: "en_route",    hosRemainingHours: 6.9, laneHistoryCount: 27, costPerMile: 1.88, laneFamiliarity: 79, currentLoadEndingInHours: 3.0, enRouteThrough: [AZ.showLow, AZ.holbrook] },
  { id: "36105", first: "Derek",   last: "Okonkwo",  city: "Kingman, AZ",          lat: 35.191,  lng: -114.063, phone: "928-555-0552", email: "derek.okonkwo@desertsunlog.com",  truckLabel: "Freightliner Cascadia · Dry",    equipment: "dry_van", ringStatus: "constrained", hosRemainingHours: 2.4, laneHistoryCount: 19, costPerMile: 1.78, laneFamiliarity: 61 },
  { id: "36106", first: "Yolanda", last: "Cruz",     city: "Lake Havasu City, AZ", lat: 34.489, lng: -114.34,   phone: "928-555-0663", email: "yolanda.cruz@desertsunlog.com",   truckLabel: "Volvo VNL 860 · Reefer",         equipment: "reefer",  ringStatus: "available",   hosRemainingHours: 10.2, laneHistoryCount: 51, costPerMile: 1.77, laneFamiliarity: 91 },
  { id: "36107", first: "Sam",     last: "Nguyen",   city: "Sierra Vista, AZ",     lat: 31.552,  lng: -110.298, phone: "520-555-0774", email: "sam.nguyen@desertsunlog.com",     truckLabel: "Kenworth W900 · Dry",            equipment: "dry_van", ringStatus: "available",   hosRemainingHours: 8.7, laneHistoryCount: 35, costPerMile: 1.8,  laneFamiliarity: 74 },
  { id: "36108", first: "Tanya",   last: "Osei",     city: "Prescott, AZ",         lat: 34.547,  lng: -112.472, phone: "928-555-0885", email: "tanya.osei@desertsunlog.com",     truckLabel: "International LT · Flatbed",     equipment: "flatbed", ringStatus: "en_route",    hosRemainingHours: 4.1, laneHistoryCount: 29, costPerMile: 1.87, laneFamiliarity: 58, currentLoadEndingInHours: 4.5, enRouteThrough: [AZ.prescott, AZ.wickenburg] },
  { id: "36109", first: "Carlos",  last: "Vega",     city: "Page, AZ",             lat: AZ.page.lat, lng: AZ.page.lng, phone: "928-555-0996", email: "carlos.vega@desertsunlog.com",    truckLabel: "Mack Anthem · Dry",              equipment: "dry_van", ringStatus: "off_duty",    hosRemainingHours: 0,   laneHistoryCount: 24, costPerMile: 1.83, laneFamiliarity: 63 },
  { id: "36110", first: "Pamela",  last: "Kowalski", city: "St. George, UT",       lat: AZ.stGeorge.lat, lng: AZ.stGeorge.lng, phone: "435-555-1007", email: "pam.kowalski@desertsunlog.com",   truckLabel: "Peterbilt 389 · Reefer (shop)",  equipment: "reefer",  ringStatus: "unavailable", hosRemainingHours: 0,   laneHistoryCount: 41, costPerMile: 2.10, laneFamiliarity: 82 },
];

function initialsOf(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export const DRIVERS: Driver[] = DRIVER_SEEDS.map((s) => {
  const pos = xy(s.lng, s.lat);
  const base: Driver = {
    id: s.id,
    name: `${s.first} ${s.last}`,
    initials: initialsOf(s.first, s.last),
    x: pos.x,
    y: pos.y,
    ringStatus: s.ringStatus,
    equipment: s.equipment,
    truckLabel: s.truckLabel,
    hosRemainingHours: s.hosRemainingHours,
    hosMaxHours: 11,
    laneHistoryCount: s.laneHistoryCount,
    costPerMile: s.costPerMile,
    laneFamiliarity: s.laneFamiliarity,
  };
  if (s.currentLoadEndingInHours !== undefined)
    base.currentLoadEndingInHours = s.currentLoadEndingInHours;
  if (s.hasActiveConflict) base.hasActiveConflict = s.hasActiveConflict;
  if (s.enRouteThrough) {
    base.enRoutePath = s.enRouteThrough.map((p) => xy(p.lng, p.lat));
  }
  return base;
});

/** Richer, non-map driver profile — contacts, license, CDL endorsements. */
export type DriverProfile = {
  driverId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  homeCity: string;
  workStatus: "AVAILABLE" | "ON_LOAD" | "INACTIVE";
  terminalId: number;
  licenseState: string;
  licenseType: "A" | "B" | "C";
  licenseExpiration: string;
  endorsements: string[];
  restrictions: string[];
};

export const DRIVER_PROFILES: DriverProfile[] = DRIVER_SEEDS.map((s, i) => {
  const active = s.ringStatus !== "off_duty" && s.ringStatus !== "unavailable";
  const onLoad = s.ringStatus === "en_route";
  const endLic = ["2027-03-14","2026-11-30","2028-06-22","2029-01-09","2026-08-17","2027-09-05","2028-12-19","2027-05-28","2026-07-11","2028-02-03"];
  const endMap = [["N","T"],["H","N"],["T","X"],["N"],["H","T","N"],["N","X"],["T"],[],["H","N","T","X"],["T","N"]];
  const restMap = [["E"],["E"],[],["E"],["E"],[],["E"],["E"],[],["E"]];
  const typeMap: DriverProfile["licenseType"][] = ["A","A","A","A","A","A","A","B","A","A"];
  return {
    driverId: s.id,
    firstName: s.first,
    lastName: s.last,
    phone: s.phone,
    email: s.email,
    homeCity: s.city,
    workStatus: !active ? "INACTIVE" : onLoad ? "ON_LOAD" : "AVAILABLE",
    terminalId: TERMINAL.id,
    licenseState: "AZ",
    licenseType: typeMap[i]!,
    licenseExpiration: endLic[i]!,
    endorsements: endMap[i]!,
    restrictions: restMap[i]!,
  };
});

/* ------------------------------------------------------------------ */
/* Loads — open boards needing a driver (all AZ ↔ AZ)                   */
/* ------------------------------------------------------------------ */

function load(
  id: string,
  origin: string,
  destination: string,
  equipment: Load["equipment"],
  revenue: number,
  deadlineOffsetHours: number,
  pickup: { lat: number; lng: number },
): Load {
  const p = xy(pickup.lng, pickup.lat);
  return {
    id,
    origin,
    destination,
    equipment,
    revenue,
    pickupDeadline: DB_NOW_MS + deadlineOffsetHours * HOUR,
    pickupX: p.x,
    pickupY: p.y,
  };
}

export const LOADS: Load[] = [
  load("L-2001", "Casa Grande, AZ", "Tucson, AZ",      "dry_van", 4200, 0.9, AZ.casaGrande),
  load("L-2002", "Flagstaff, AZ",  "Phoenix, AZ",     "reefer",  5100, 3.2, AZ.flagstaff),
  load("L-2003", "Yuma, AZ",       "Bullhead City, AZ", "flatbed", 3800, 4.1, AZ.yuma),
  load("L-2004", "Sierra Vista, AZ", "Nogales, AZ",   "reefer",  4400, 5.0, AZ.sierraVista),
  load("L-2005", "Prescott, AZ",   "Kingman, AZ",     "dry_van", 2900, 7.0, AZ.prescott),
  load("L-2006", "Show Low, AZ",   "Winslow, AZ",     "dry_van", 3450, 9.0, AZ.showLow),
];

/* ------------------------------------------------------------------ */
/* Trips — currently-active load assignments                            */
/*                                                                      */
/* Seeded from 07_trip_create_response.json (trip shell) +              */
/* 02_tracking_driver_dispatch_response.json (trail) +                  */
/* 00c_driver_performance_response.json (schedule / actual / OOR).      */
/* ------------------------------------------------------------------ */

const T = (h: number, m = 0) =>
  DEMO_DAY_START_MS + h * HOUR + m * MINUTE;

export const TRIPS: Trip[] = [
  {
    tripId: `${TRIP_DAY_ID}-1`,
    loadId: "L-3001",
    driverId: "36101",
    vehicleNo: "DSL-Truck-01",
    status: "en_route",
    scheduledStart: T(20, 0),
    scheduledEnd: T(22, 30),
    oorMiles: 2.1,
    scheduleMiles: 148.0,
    actualMiles: 150.1,
    scheduleMinutes: 162,
    actualMinutes: 165,
    trail: [
      { lat: 32.251, lng: -110.947, time: T(18, 0) },
      { lat: 32.2485, lng: -110.955, time: T(18, 15) },
      { lat: 32.2455, lng: -110.962, time: T(18, 30) },
    ],
  },
  {
    tripId: `${TRIP_DAY_ID}-2`,
    loadId: "L-3002",
    driverId: "36102",
    vehicleNo: "DSL-Truck-02",
    status: "delayed",
    scheduledStart: T(19, 30),
    scheduledEnd: T(21, 45),
    oorMiles: 0.8,
    scheduleMiles: 210.5,
    actualMiles: 211.3,
    scheduleMinutes: 228,
    actualMinutes: 264,
    trail: [
      { lat: 32.718, lng: -114.618, time: T(18, 0) },
      { lat: 32.722, lng: -114.612, time: T(18, 15) },
      { lat: 32.726, lng: -114.606, time: T(18, 30) },
    ],
  },
  {
    tripId: `${TRIP_DAY_ID}-3`,
    loadId: "L-3003",
    driverId: "36104",
    vehicleNo: "DSL-Truck-04",
    status: "en_route",
    scheduledStart: T(22, 0),
    scheduledEnd: T(23, 45),
    oorMiles: 1.2,
    scheduleMiles: 175.0,
    actualMiles: 176.2,
    scheduleMinutes: 195,
    actualMinutes: 197,
    trail: [
      { lat: 34.263, lng: -110.035, time: T(18, 0) },
      { lat: 34.267, lng: -110.041, time: T(18, 15) },
      { lat: 34.271, lng: -110.047, time: T(18, 30) },
    ],
  },
  {
    tripId: `${TRIP_DAY_ID}-4`,
    loadId: "L-3004",
    driverId: "36108",
    vehicleNo: "DSL-Truck-08",
    status: "en_route",
    scheduledStart: T(18, 0),
    scheduledEnd: T(19, 45),
    oorMiles: 4.2,
    scheduleMiles: 112.0,
    actualMiles: 116.2,
    scheduleMinutes: 126,
    actualMinutes: 132,
    trail: [
      { lat: 34.547, lng: -112.472, time: T(18, 0) },
      { lat: 34.551, lng: -112.466, time: T(18, 15) },
      { lat: 34.555, lng: -112.459, time: T(18, 30) },
    ],
  },
];

function inTransitLoad(
  id: string,
  origin: string,
  destination: string,
  equipment: Load["equipment"],
  revenue: number,
  deadlineMs: number,
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
): Load {
  const p = xy(pickup.lng, pickup.lat);
  const q = xy(dropoff.lng, dropoff.lat);
  return {
    id,
    origin,
    destination,
    equipment,
    revenue,
    pickupDeadline: deadlineMs,
    pickupX: p.x,
    pickupY: p.y,
    dropoffX: q.x,
    dropoffY: q.y,
  };
}

/** In-transit loads that trips reference (not on the open board). */
export const IN_TRANSIT_LOADS: Load[] = [
  inTransitLoad(
    "L-3001",
    "Tucson, AZ",
    "Casa Grande, AZ",
    "dry_van",
    1800,
    T(20, 0),
    AZ.tucson,
    AZ.casaGrande,
  ),
  inTransitLoad(
    "L-3002",
    "San Luis, AZ",
    "Lake Havasu City, AZ",
    "reefer",
    2400,
    T(19, 30),
    AZ.yuma,
    AZ.lakeHavasu,
  ),
  inTransitLoad(
    "L-3003",
    "Show Low, AZ",
    "Holbrook, AZ",
    "flatbed",
    1500,
    T(22, 0),
    AZ.showLow,
    AZ.holbrook,
  ),
  inTransitLoad(
    "L-3004",
    "Prescott, AZ",
    "Wickenburg, AZ",
    "flatbed",
    1950,
    T(18, 0),
    AZ.prescott,
    AZ.wickenburg,
  ),
];

/* ------------------------------------------------------------------ */
/* Alerts on in-transit trucks                                          */
/* ------------------------------------------------------------------ */

export const ALERTS: TruckAlert[] = [
  {
    alertId: "ALT-0001",
    tripId: `${TRIP_DAY_ID}-2`,
    driverId: "36102",
    vehicleNo: "DSL-Truck-02",
    loadId: "L-3002",
    type: "breakdown",
    severity: "critical",
    headline: "Reefer unit engine-sync fault",
    detail:
      "ELD flagged an Engine Synchronization diagnostic on the reefer unit. Trailer temp is climbing past setpoint; driver has pulled onto the I-8 shoulder east of Yuma. Repeat diagnostic 12 min ago.",
    detectedAt: T(18, 18),
    lastLat: 32.726,
    lastLng: -114.606,
    etaImpactMinutes: 36,
    recommendedAction:
      "Relay cold load to DSL-Truck-06 (Yolanda Cruz) staged at Lake Havasu yard; dispatch mobile mechanic toward Yuma.",
    acknowledged: false,
  },
  {
    alertId: "ALT-0002",
    tripId: `${TRIP_DAY_ID}-4`,
    driverId: "36108",
    vehicleNo: "DSL-Truck-08",
    loadId: "L-3004",
    type: "route_deviation",
    severity: "warning",
    headline: "4.2 mi off planned lane near Prescott Valley",
    detail:
      "Truck left the planned AZ-89 → Copper Basin corridor after 18:15 ping. Tracking northeast on paved county road with no booked stop.",
    detectedAt: T(18, 22),
    lastLat: 34.555,
    lastLng: -112.459,
    etaImpactMinutes: 18,
    recommendedAction:
      "Call driver to confirm; if detour is for fuel or receiver change, re-plan ETA. Otherwise steer back toward AZ-89.",
    acknowledged: false,
  },
  {
    alertId: "ALT-0003",
    tripId: `${TRIP_DAY_ID}-1`,
    driverId: "36101",
    vehicleNo: "DSL-Truck-01",
    loadId: "L-3001",
    type: "hos_risk",
    severity: "warning",
    headline: "HOS window tight for return leg",
    detail:
      "Marcus Webb has 7.4h remaining on today's 11-hour clock. Current trip consumes ~2.5h; return home puts him within 60 min of cutoff.",
    detectedAt: T(18, 5),
    lastLat: 32.2455,
    lastLng: -110.962,
    etaImpactMinutes: 0,
    recommendedAction:
      "Do not stack a next load on this unit today; schedule reset at Phoenix Hub.",
    acknowledged: true,
  },
  {
    alertId: "ALT-0004",
    tripId: `${TRIP_DAY_ID}-3`,
    driverId: "36104",
    vehicleNo: "DSL-Truck-04",
    loadId: "L-3003",
    type: "weather_delay",
    severity: "info",
    headline: "Dust advisory on I-40 near Winslow",
    detail:
      "AZ511 reports blowing dust along I-40 between Winslow and Joseph City through 20:30 local. Current empty reposition crosses that window.",
    detectedAt: T(18, 10),
    lastLat: 34.271,
    lastLng: -110.047,
    etaImpactMinutes: 15,
    recommendedAction:
      "Notify receiver of 15-min slip; no reroute needed if visibility holds.",
    acknowledged: false,
  },
];

/* ------------------------------------------------------------------ */
/* Query helpers                                                        */
/* ------------------------------------------------------------------ */

const loadIndex = () => new Map<string, Load>([...LOADS, ...IN_TRANSIT_LOADS].map((l) => [l.id, l]));
const driverIndex = () => new Map(DRIVERS.map((d) => [d.id, d]));
const vehicleIndex = () => new Map(VEHICLES.map((v) => [v.vehicleNo, v]));
const tripIndex = () => new Map(TRIPS.map((t) => [t.tripId, t]));

export function getDriver(id: string) {
  return driverIndex().get(id);
}
export function getLoad(id: string) {
  return loadIndex().get(id);
}
export function getVehicleByNo(no: string) {
  return vehicleIndex().get(no);
}
export function getTrip(id: string) {
  return tripIndex().get(id);
}

export function getDriverProfile(driverId: string): DriverProfile | undefined {
  return DRIVER_PROFILES.find((p) => p.driverId === driverId);
}

/** Primary truck assigned to this driver in the dummy fleet (one-to-one). */
export function getVehicleForDriver(driverId: string): Vehicle | undefined {
  return VEHICLES.find((v) => v.driverId === driverId);
}

/** In-motion trip for this driver, if any. */
export function getActiveTripForDriver(driverId: string): Trip | undefined {
  return TRIPS.find(
    (t) =>
      t.driverId === driverId &&
      (t.status === "en_route" || t.status === "delayed"),
  );
}

/** Map route context: pickup → dropoff with current position from ELD trail (or driver pin). */
export type DriverTripRouteContext = {
  tripId: string;
  loadId: string;
  originLngLat: { lng: number; lat: number };
  destLngLat: { lng: number; lat: number };
  currentLngLat: { lng: number; lat: number };
  scheduledEndMs: number;
};

export function getDriverTripRouteContext(
  driverId: string,
): DriverTripRouteContext | null {
  const trip = getActiveTripForDriver(driverId);
  if (!trip) return null;
  const load = getLoad(trip.loadId);
  if (!load || load.dropoffX == null || load.dropoffY == null) return null;
  const originLngLat = svgToLngLat(load.pickupX, load.pickupY);
  const destLngLat = svgToLngLat(load.dropoffX, load.dropoffY);
  const last = trip.trail[trip.trail.length - 1];
  const drv = getDriver(driverId);
  const currentLngLat = last
    ? { lng: last.lng, lat: last.lat }
    : drv
      ? svgToLngLat(drv.x, drv.y)
      : originLngLat;
  return {
    tripId: trip.tripId,
    loadId: trip.loadId,
    originLngLat,
    destLngLat,
    currentLngLat,
    scheduledEndMs: trip.scheduledEnd,
  };
}

/**
 * Ranked driver slate + comparison matrix for a given open load.
 *
 * Uses the existing `scoring.rankDriversForLoad` so the UI's
 * comparison tray already renders the same numbers.
 */
export function getLoadRecommendations(loadId: string): LoadRecommendation | null {
  const load = getLoad(loadId);
  if (!load) return null;

  const ranked = rankDriversForLoad(load, DRIVERS);

  const comparison = ranked.map((r, idx) => ({
    driverId: r.driver.id,
    driverName: r.driver.name,
    matchPercent: r.matchPercent,
    distanceMiles: Math.round(r.features.distanceToPickupMiles),
    hosRemaining: Math.round(r.features.hosRemaining * 10) / 10,
    equipmentMatch: r.features.equipmentMatch >= 1,
    costPerMile: r.features.costPerMile,
    laneFamiliarity: Math.round(r.features.laneFamiliarity * 100),
    rejectTags: r.rejectTags,
    headline: shortAiReason(r, idx + 1),
  }));

  return { load, ranked, comparison };
}

/** Short summary list of every alert currently on the board. */
export function listAlerts(): TruckAlert[] {
  return [...ALERTS].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.detectedAt - a.detectedAt);
}

function severityRank(s: TruckAlert["severity"]): number {
  return s === "critical" ? 3 : s === "warning" ? 2 : 1;
}

/** Full alert detail: alert + driver + vehicle + trip + load — one call for the UI. */
export function getAlertDetail(alertId: string): TruckAlertDetail | null {
  const alert = ALERTS.find((a) => a.alertId === alertId);
  if (!alert) return null;
  const driver = getDriver(alert.driverId);
  const vehicle = getVehicleByNo(alert.vehicleNo);
  const trip = getTrip(alert.tripId);
  const load = getLoad(alert.loadId);
  if (!driver || !vehicle || !trip || !load) return null;
  return { alert, driver, vehicle, trip, load };
}

/** Alternate lookup by truck number (vehicleNo) — returns all alerts on that unit. */
export function getAlertsForTruck(vehicleNo: string): TruckAlert[] {
  return ALERTS.filter((a) => a.vehicleNo === vehicleNo);
}

/** Ops alerts tied to this driver (same as their assigned truck in the dummy fleet). */
export function getAlertsForDriver(driverId: string): TruckAlert[] {
  return ALERTS.filter((a) => a.driverId === driverId).sort(
    (a, b) =>
      severityRank(b.severity) -
        severityRank(a.severity) || b.detectedAt - a.detectedAt,
  );
}

/** Convenience summary used by dashboards. */
export function getFleetSummary() {
  return {
    fleetName: FLEET_NAME,
    terminal: TERMINAL,
    driverCount: DRIVERS.length,
    activeDrivers: DRIVERS.filter(
      (d) => d.ringStatus !== "off_duty" && d.ringStatus !== "unavailable",
    ).length,
    openLoadCount: LOADS.length,
    inTransitCount: TRIPS.filter((t) => t.status === "en_route" || t.status === "delayed").length,
    alertCount: ALERTS.length,
    criticalAlertCount: ALERTS.filter((a) => a.severity === "critical").length,
    generatedAt: DB_NOW_MS,
  };
}
