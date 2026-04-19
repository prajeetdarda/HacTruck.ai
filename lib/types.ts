/** Ring / availability semantics for map nodes */
export type DriverRingStatus =
  | "available" // green — strong HOS
  | "constrained" // amber — available but tight HOS or other limits
  | "unavailable" // red — exhausted / maintenance
  | "en_route" // blue — on active load
  | "off_duty"; // gray

export type EquipmentType = "dry_van" | "reefer" | "flatbed";

<<<<<<< HEAD
/**
 * Hard “gate” labels: the driver is still ranked for transparency, but auto-assign
 * should prefer someone with zero tags unless every candidate is flagged.
 */
=======
>>>>>>> ac9292124734fe01923a682f71ae84fc03f024db
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

export type ToastState = {
  id: string;
  message: string;
  sub?: string;
} | null;

export type PendingUndo = {
  loadId: string;
  driverId: string;
  driverName: string;
  loadLabel: string;
} | null;
<<<<<<< HEAD

/** Proactive ops center — deviation, delay, weather, idle, etc. */
export type AlertSeverity = "critical" | "warning" | "info";

export type AlertKind =
  | "delay"
  | "deviation"
  | "idle"
  | "weather"
  | "deadline"
  | "hos"
  | "breakdown";

export type ProactiveAlert = {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  driverId?: string;
  loadId?: string;
};
=======
>>>>>>> ac9292124734fe01923a682f71ae84fc03f024db
