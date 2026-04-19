/** Fleet health level for map + dispatch (four levels). */
export type DriverRingStatus =
  | "urgent" // 1 red — critical
  | "watch" // 2 amber — needs attention
  | "good" // 3 green — healthy
  | "inactive"; // 4 gray — not in service

export const DRIVER_RING_LABEL: Record<DriverRingStatus, string> = {
  urgent: "Urgent",
  watch: "Watch",
  good: "Good",
  inactive: "Inactive",
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
