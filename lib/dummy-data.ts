/**
 * Deterministic dummy data for tests, Storybook, and API smoke checks.
 * UI demo continues to use `lib/mock-data.ts`; use this when you need stable IDs/timestamps.
 */
import type { Driver, Load } from "./types";
import { lngLatToSvg } from "./geo-bridge";

/** Fixed instant — deadlines in dummy loads are relative to this (deterministic). */
export const DUMMY_REFERENCE_MS = Date.parse("2026-04-18T12:00:00.000Z");

export const DUMMY_FLEET_NAME = "TestLane Express (dummy)";

const PHX = lngLatToSvg(-112.074, 33.448);

/** Single minimal load for fast unit tests — Phoenix pickup */
export const DUMMY_LOAD_TEST: Load = {
  id: "L-TEST-001",
  origin: "Phoenix, AZ",
  destination: "Tucson, AZ",
  equipment: "dry_van",
  revenue: 3100,
  pickupDeadline: DUMMY_REFERENCE_MS + 2 * 60 * 60 * 1000,
  pickupX: Math.round(PHX.x),
  pickupY: Math.round(PHX.y),
};

/** Driver placed near DUMMY_LOAD_TEST pickup */
export const DUMMY_DRIVER_NEAR: Driver = {
  id: "d-test-1",
  name: "Test Driver Alpha",
  initials: "TA",
  x: Math.round(PHX.x) + 5,
  y: Math.round(PHX.y) - 4,
  ringStatus: "good",
  equipment: "dry_van",
  truckLabel: "Test Rig · Dry",
  hosRemainingHours: 10,
  hosMaxHours: 11,
  laneHistoryCount: 10,
  costPerMile: 1.75,
  laneFamiliarity: 70,
};

const TUC = lngLatToSvg(-110.975, 32.223);

/** Driver farther on I-10 corridor + wrong equipment — “rejected” scoring */
export const DUMMY_DRIVER_FAR: Driver = {
  id: "d-test-2",
  name: "Test Driver Beta",
  initials: "TB",
  x: Math.round(TUC.x) + 40,
  y: Math.round(TUC.y) + 25,
  ringStatus: "good",
  equipment: "reefer",
  truckLabel: "Test Rig · Reefer",
  hosRemainingHours: 8,
  hosMaxHours: 11,
  laneHistoryCount: 3,
  costPerMile: 2.05,
  laneFamiliarity: 20,
};

export const DUMMY_DRIVERS_MINIMAL: Driver[] = [
  DUMMY_DRIVER_NEAR,
  DUMMY_DRIVER_FAR,
];

export const DUMMY_LOADS_MINIMAL: Load[] = [DUMMY_LOAD_TEST];

/** Payload shape aligned with GET /api/fleet (for tests / Postman). */
export function getDummyFleetPayload() {
  return {
    fleetName: DUMMY_FLEET_NAME,
    generatedAt: DUMMY_REFERENCE_MS,
    loads: DUMMY_LOADS_MINIMAL,
    drivers: DUMMY_DRIVERS_MINIMAL,
  };
}
