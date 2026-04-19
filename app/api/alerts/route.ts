import { listDrivers, listLoads } from "@/lib/server/fleet-repository";
import { getSimulatedHos, isLoadOverdue } from "@/lib/simulation";
import { jsonError, jsonOk } from "@/lib/server/http";

export type AlertSeverity = "warning" | "critical";

export type Alert = {
  id: string;
  type: "delay" | "hos_violation";
  severity: AlertSeverity;
  entityId: string;
  entityName: string;
  message: string;
};

const DELAY_WARNING_MS = 60 * 60 * 1000; // 1 hour before deadline
const HOS_CRITICAL_HOURS = 1.5;
const HOS_WARNING_HOURS = 3;

/**
 * GET /api/alerts?offsetHours=0
 * Returns active delay alerts and HOS violation warnings.
 *
 * Delay alerts:
 *   - critical: pickup deadline already passed at the simulated time
 *   - warning: deadline within the next hour
 *
 * HOS alerts:
 *   - critical: < 1.5 h remaining
 *   - warning: < 3 h remaining (and driver is on duty)
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("offsetHours");
  const offsetHours = raw != null && raw !== "" ? Number(raw) : 0;

  if (!Number.isFinite(offsetHours) || offsetHours < 0 || offsetHours > 72) {
    return jsonError("offsetHours must be a number between 0 and 72", 400, "VALIDATION");
  }

  const nowMs = Date.now();
  const simNowMs = nowMs + offsetHours * 60 * 60 * 1000;

  const alerts: Alert[] = [];

  // Delay alerts
  for (const load of listLoads()) {
    const overdue = isLoadOverdue(load, offsetHours, nowMs);
    const msUntilDeadline = load.pickupDeadline - simNowMs;

    if (overdue) {
      alerts.push({
        id: `delay-critical-${load.id}`,
        type: "delay",
        severity: "critical",
        entityId: load.id,
        entityName: `${load.origin} → ${load.destination}`,
        message: `Pickup deadline missed for load ${load.id}`,
      });
    } else if (msUntilDeadline <= DELAY_WARNING_MS) {
      const minsLeft = Math.round(msUntilDeadline / 60_000);
      alerts.push({
        id: `delay-warning-${load.id}`,
        type: "delay",
        severity: "warning",
        entityId: load.id,
        entityName: `${load.origin} → ${load.destination}`,
        message: `Load ${load.id} pickup deadline in ${minsLeft} min`,
      });
    }
  }

  // HOS violation alerts
  for (const driver of listDrivers()) {
    if (driver.ringStatus === "off_duty" || driver.ringStatus === "unavailable") {
      continue;
    }

    const hos = getSimulatedHos(driver, offsetHours);

    if (hos <= HOS_CRITICAL_HOURS) {
      alerts.push({
        id: `hos-critical-${driver.id}`,
        type: "hos_violation",
        severity: "critical",
        entityId: driver.id,
        entityName: driver.name,
        message: `${driver.name} has only ${hos.toFixed(1)}h HOS remaining — must rest soon`,
      });
    } else if (hos <= HOS_WARNING_HOURS) {
      alerts.push({
        id: `hos-warning-${driver.id}`,
        type: "hos_violation",
        severity: "warning",
        entityId: driver.id,
        entityName: driver.name,
        message: `${driver.name} is running low on HOS (${hos.toFixed(1)}h left)`,
      });
    }
  }

  return jsonOk({
    offsetHours,
    ts: nowMs,
    totalAlerts: alerts.length,
    criticalCount: alerts.filter((a) => a.severity === "critical").length,
    warningCount: alerts.filter((a) => a.severity === "warning").length,
    alerts,
  });
}
