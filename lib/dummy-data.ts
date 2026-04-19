/**
 * Fixture payload for `/api/fixtures/dummy` — slices the canonical `backend-db`.
 */
import { DB_NOW_MS, DRIVERS, FLEET_NAME, LOADS } from "./backend-db";

/** Alias for callers that expect a fixed reference instant (same as backend `DB_NOW_MS`). */
export const DUMMY_REFERENCE_MS = DB_NOW_MS;

export function getDummyFleetPayload() {
  return {
    fleetName: FLEET_NAME,
    generatedAt: DB_NOW_MS,
    loads: LOADS.slice(0, 1),
    drivers: DRIVERS.slice(0, 2),
  };
}
