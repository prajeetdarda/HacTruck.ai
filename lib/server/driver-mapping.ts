/**
 * Bridges NavPro fleet identity with ELD HOS data.
 *
 * Five of the ten NavPro drivers have a corresponding entry in the ELD log;
 * the other five are dispatchable but have no HOS history (treated as
 * "synthetic clean" — full 11h drive remaining, no malfunctions). The two
 * Inactive drivers in the NavPro feed are filtered out upstream by
 * `listActiveDrivers()` and never appear here.
 *
 * Identity mapping (NavPro driverId → ELD username):
 *   36101 Marcus Webb       → jose_martinez   (ok HOS)
 *   36102 Rosa Delgado      → sarah_thompson  (ok + active diagnostic)
 *   36103 Jake Torres       → mike_chen       (HOS violation + malfunction)
 *   36104 Anita Pham        → lisa_rod        (warn — tight HOS)
 *   36105 Derek Okonkwo     → david_kim       (HOS violation)
 *   36106 Yolanda Cruz      → (none)          (synthetic clean)
 *   36107 Sam Nguyen        → (none)          (synthetic clean)
 *   36108 Tanya Osei        → (none)          (synthetic clean)
 */

import {
  getDriverHosState,
  getEldNow,
  type HosState,
} from "./eld-loader";
import {
  getFleetDriver,
  listActiveDrivers,
  type FleetDriver,
} from "./navpro-loader";

/** NavPro driver_id → ELD username. Only includes drivers with an overlay. */
export const ELD_OVERLAY: Record<number, string> = {
  36101: "jose_martinez",
  36102: "sarah_thompson",
  36103: "mike_chen",
  36104: "lisa_rod",
  36105: "david_kim",
};

/** Reverse lookup: ELD username → NavPro driver_id. */
export const NAVPRO_BY_ELD: Record<string, number> = Object.fromEntries(
  Object.entries(ELD_OVERLAY).map(([id, u]) => [u, Number(id)]),
);

/**
 * Synthetic HOS for drivers without an ELD overlay. Treats them as fully
 * rested at the start of their 14h driving window. Intentionally optimistic
 * so they appear as strong dispatchable fallbacks in the demo.
 */
function syntheticHos(eldUsername: string | null): HosState {
  return {
    username: eldUsername ?? "synthetic",
    lastPosition: { lat: 0, lng: 0 }, // unused — caller uses NavPro position
    lastEventTs: 0,
    dutyStatus: "On Duty (Not Driving)",
    driveTimeUsedH: 0,
    driveTimeRemainingH: 11,
    cycleUsedH: 0,
    cycleRemainingH: 70,
    activeMalfunctionCodes: [],
    hosRiskLevel: "ok",
  };
}

/**
 * Combined view: NavPro fleet driver + HOS state (real or synthetic).
 * This is what scoring and alerts should consume.
 */
export type EnrichedDriver = FleetDriver & {
  eldUsername: string | null;
  hos: HosState;
  /** True when HOS came from the ELD log; false when synthetic. */
  hasEldOverlay: boolean;
};

/**
 * Enrich one fleet driver with HOS state at the given time. Defaults to the
 * ELD anchor; pass `getEldNow() + offsetH * 3_600_000` to drive HOS from the
 * dispatcher's timeline scrubber.
 */
export function enrichDriverWithHos(
  driver: FleetDriver,
  atTs: number = getEldNow(),
): EnrichedDriver {
  const eldUsername = ELD_OVERLAY[driver.driverId] ?? null;
  const hos = eldUsername
    ? (getDriverHosState(eldUsername, atTs) ?? syntheticHos(eldUsername))
    : syntheticHos(null);
  return {
    ...driver,
    eldUsername,
    hos,
    hasEldOverlay: eldUsername != null,
  };
}

/** All Active drivers, enriched with HOS. Use this as the dispatch board source. */
export function listEnrichedActiveDrivers(
  atTs: number = getEldNow(),
): EnrichedDriver[] {
  return listActiveDrivers().map((d) => enrichDriverWithHos(d, atTs));
}

export function getEnrichedDriver(
  driverId: number,
  atTs: number = getEldNow(),
): EnrichedDriver | null {
  const d = getFleetDriver(driverId);
  return d ? enrichDriverWithHos(d, atTs) : null;
}
