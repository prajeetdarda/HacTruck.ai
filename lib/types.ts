/**
 * Driver status on the map and in scoring.
 * Legacy four “health rings” plus operational states from `lib/backend-db.ts`.
 */
export type DriverRingStatus =
  | "urgent"
  | "watch"
  | "good"
  | "inactive"
  | "en_route"
  | "available"
  | "constrained"
  | "off_duty"
  | "unavailable";

/** Four buckets for the top bar fleet strip + map ring filter. */
export type FleetSummaryRing = "urgent" | "watch" | "good" | "inactive";

/** Map granular status → summary bucket (Desert Sun ops + legacy rings). */
export function fleetSummaryRing(status: DriverRingStatus): FleetSummaryRing {
  switch (status) {
    case "urgent":
    case "constrained":
      return "urgent";
    case "watch":
    case "en_route":
      return "watch";
    case "good":
    case "available":
      return "good";
    case "inactive":
    case "off_duty":
    case "unavailable":
      return "inactive";
    default: {
      const _x: never = status;
      return _x;
    }
  }
}

/** Same bucketing as map ring filter / top bar — one row per simulated driver. */
export function countDriversByFleetSummaryRing(
  drivers: Driver[],
): Record<FleetSummaryRing, number> {
  const n: Record<FleetSummaryRing, number> = {
    urgent: 0,
    watch: 0,
    good: 0,
    inactive: 0,
  };
  for (const d of drivers) {
    n[fleetSummaryRing(d.ringStatus)] += 1;
  }
  return n;
}

export const DRIVER_RING_LABEL: Record<DriverRingStatus, string> = {
  urgent: "Urgent",
  watch: "Watch",
  good: "Good",
  inactive: "Inactive",
  en_route: "En route",
  available: "Available",
  constrained: "Constrained",
  off_duty: "Off duty",
  unavailable: "Unavailable",
};

export type EquipmentType = "dry_van" | "reefer" | "flatbed";

export type RejectTag =
  | "wrong_equipment"
  | "too_far"
  | "low_hos"
  | "off_duty"
  | "conflict";

export type Driver = {
  id: string;
  name: string;
  initials: string;
  /** SVG map coordinates (viewBox 1000×600) */
  x: number;
  y: number;
  /** Optional path for en-route dotted line: points in same coordinate space */
  enRoutePath?: { x: number; y: number }[];
  ringStatus: DriverRingStatus;
  equipment: EquipmentType;
  truckLabel: string;
  hosRemainingHours: number;
  hosMaxHours: number;
  laneHistoryCount: number;
  costPerMile: number;
  laneFamiliarity: number; // 0–100
  /** If en route, hours until current delivery / drop */
  currentLoadEndingInHours?: number;
  /** Simulated conflict with another locked load */
  hasActiveConflict?: boolean;
};

export type Load = {
  id: string;
  origin: string;
  destination: string;
  equipment: EquipmentType;
  revenue: number;
  /** Wall-clock deadline (ms since epoch) */
  pickupDeadline: number;
  pickupX: number;
  pickupY: number;
  /** Delivery / drop-off (SVG space) — set for in-transit loads and trip map routes */
  dropoffX?: number;
  dropoffY?: number;
};

/** Feature bundle for scoring — safe to send to a future LLM API */
export type DriverLoadFeatures = {
  loadId: string;
  driverId: string;
  distanceToPickupMiles: number;
  hosRemaining: number;
  equipmentMatch: number;
  laneFamiliarity: number;
  costPerMile: number;
  currentLoadEndingSoon: boolean;
  ringStatus: DriverRingStatus;
  hasActiveConflict: boolean;
};

export type RankedDriver = {
  driver: Driver;
  score: number;
  matchPercent: number;
  reasons: string[];
  rejectTags: RejectTag[];
  features: DriverLoadFeatures;
};

/** Undo window for assignment toast — keep in sync with `DispatchProvider` dismiss timer. */
export const ASSIGN_UNDO_TOAST_MS = 5000;

export type AssignmentToastSummary = {
  loadId: string;
  loadRoute: string;
  loadEquipment: EquipmentType;
  driverName: string;
  driverInitials: string;
  truckLabel: string;
  matchPercent?: number;
};

export type ToastState = {
  id: string;
  message: string;
  sub?: string;
  summary?: AssignmentToastSummary;
  /** When undo/dismiss auto-closes the toast (client clock). */
  undoDeadlineMs: number;
} | null;

/* --- backend-db domain (Desert Sun API shape) --- */

export type TripStatus = "en_route" | "delayed" | "completed" | string;

export type TripTrailPoint = { lat: number; lng: number; time: number };

export type Trip = {
  tripId: string;
  loadId: string;
  driverId: string;
  vehicleNo: string;
  status: TripStatus;
  scheduledStart: number;
  scheduledEnd: number;
  oorMiles: number;
  scheduleMiles: number;
  actualMiles: number;
  scheduleMinutes: number;
  actualMinutes: number;
  trail: TripTrailPoint[];
};

export type VehicleStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | string;

export type Vehicle = {
  vehicleId: number;
  vehicleNo: string;
  driverId: string;
  vin: string;
  make: string;
  model: string;
  grossWeightLbs: number;
  equipment: EquipmentType;
  type: string;
  status: VehicleStatus;
};

export type TruckAlertSeverity = "critical" | "warning" | "info";

export type TruckAlert = {
  alertId: string;
  tripId: string;
  driverId: string;
  vehicleNo: string;
  loadId: string;
  type: string;
  severity: TruckAlertSeverity;
  headline: string;
  detail: string;
  detectedAt: number;
  lastLat: number;
  lastLng: number;
  etaImpactMinutes: number;
  recommendedAction: string;
  acknowledged: boolean;
};

export type TruckAlertDetail = {
  alert: TruckAlert;
  driver: Driver;
  vehicle: Vehicle;
  trip: Trip;
  load: Load;
};

export type LoadRecommendationComparisonRow = {
  driverId: string;
  driverName: string;
  matchPercent: number;
  distanceMiles: number;
  hosRemaining: number;
  equipmentMatch: boolean;
  costPerMile: number;
  laneFamiliarity: number;
  rejectTags: RejectTag[];
  headline: string;
};

export type LoadRecommendation = {
  load: Load;
  ranked: RankedDriver[];
  comparison: LoadRecommendationComparisonRow[];
};
