import type { FleetSummaryRing, TruckAlert } from "./types";

/**
 * Map ops alert severity → same four buckets as fleet driver rings in the top bar.
 * Critical operational issues surface under **urgent**; routine advisories under **good**.
 */
export function opsAlertToFleetRing(alert: TruckAlert): FleetSummaryRing {
  switch (alert.severity) {
    case "critical":
      return "urgent";
    case "warning":
      return "watch";
    case "info":
    default:
      return "good";
  }
}

export function countOpsAlertsByFleetRing(
  alerts: TruckAlert[],
): Record<FleetSummaryRing, number> {
  const n: Record<FleetSummaryRing, number> = {
    urgent: 0,
    watch: 0,
    good: 0,
    inactive: 0,
  };
  for (const a of alerts) {
    n[opsAlertToFleetRing(a)] += 1;
  }
  return n;
}

export function filterOpsAlertsForFleetRing(
  alerts: TruckAlert[],
  ring: FleetSummaryRing,
): TruckAlert[] {
  return alerts.filter((a) => opsAlertToFleetRing(a) === ring);
}
