/**
 * Hardcoded “AZ511-style” road situations for the demo timeline (0–24h scrub).
 * No live feeds — copy mimics traveler-info incident / closure / weather advisories.
 */

import type { Driver, TruckAlertSeverity } from "./types";

export type Demo511SituationDef = {
  id: string;
  /** Half-open interval [startHour, endHour) in simulation hours (same space as timeline scrub). */
  startHour: number;
  endHour: number;
  driverId: string;
  severity: TruckAlertSeverity;
  type: string;
  headline: string;
  detail: string;
  recommendedAction: string;
  etaImpactMinutes: number;
};

export const DEMO_511_SITUATIONS: Demo511SituationDef[] = [
  {
    id: "i10-lane-closure",
    startHour: 0,
    endHour: 5.5,
    driverId: "36101",
    severity: "warning",
    type: "road_conditions",
    headline: "Lane closure I-10 · Casa Grande corridor",
    detail:
      "AZ511: rolling lane closures both directions I-10 near Casa Grande for bridge deck work. Expect 10–20 mph queues through the work zone; your active Tucson run crosses this segment.",
    recommendedAction:
      "Confirm alternate US-84 / SR-387 cut with Marcus if delay exceeds 25 min; notify receiver of slip.",
    etaImpactMinutes: 22,
  },
  {
    id: "i40-dust-advisory",
    startHour: 2,
    endHour: 10,
    driverId: "36104",
    severity: "info",
    type: "weather_delay",
    headline: "Dust advisory on I-40 near Winslow",
    detail:
      "AZ511 reports blowing dust along I-40 between Winslow and Joseph City during this window. Show Low → Holbrook leg may see reduced visibility.",
    recommendedAction:
      "Notify receiver of possible 15-min slip; hold lane unless visibility drops below ¼ mi.",
    etaImpactMinutes: 15,
  },
  {
    id: "i8-incident-queue",
    startHour: 5.5,
    endHour: 14,
    driverId: "36102",
    severity: "critical",
    type: "incident_delay",
    headline: "Heavy delay I-8 eastbound · Yuma area",
    detail:
      "AZ511: incident and lane block on I-8 east of Yuma; stop-and-go past the agricultural inspection area. Reefer setpoint is stable but ETA is slipping.",
    recommendedAction:
      "Stage relay at Lake Havasu if queue exceeds 45 min; keep reefer logs for receiver.",
    etaImpactMinutes: 42,
  },
];

export function isSituationActiveAt(
  s: Demo511SituationDef,
  offsetHours: number,
): boolean {
  return offsetHours >= s.startHour && offsetHours < s.endHour;
}

export function activeSituationsAt(offsetHours: number): Demo511SituationDef[] {
  return DEMO_511_SITUATIONS.filter((s) => isSituationActiveAt(s, offsetHours));
}

const SEV_RANK: Record<TruckAlertSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

/** Highest-severity active situation for this driver at the scrubbed offset, if any. */
export function activeSituationForDriver(
  driverId: string,
  offsetHours: number,
): Demo511SituationDef | null {
  const acts = activeSituationsAt(offsetHours).filter((s) => s.driverId === driverId);
  if (acts.length === 0) return null;
  return [...acts].sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])[0]!;
}

/**
 * After HOS / path simulation, bump ring status when a 511 situation affects this driver.
 */
export function apply511RingOverride(
  driver: Driver,
  offsetHours: number,
): Driver {
  const sit = activeSituationForDriver(driver.id, offsetHours);
  if (!sit) return driver;
  if (driver.ringStatus === "off_duty" || driver.ringStatus === "unavailable") {
    return driver;
  }
  if (sit.severity === "critical") {
    return { ...driver, ringStatus: "urgent" };
  }
  if (sit.severity === "warning") {
    if (driver.ringStatus === "urgent") return driver;
    return { ...driver, ringStatus: "watch" };
  }
  if (driver.ringStatus === "urgent") return driver;
  return { ...driver, ringStatus: "watch" };
}
