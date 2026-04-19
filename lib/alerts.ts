import type { Driver, Load, ProactiveAlert } from "./types";

export type AlertInputs = {
  drivers: Driver[];
  openLoads: Load[];
  nowMs: number;
  /** Timeline scrub offset (hours) — shifts “simulated now” for demo scenarios */
  offsetHours: number;
};

function simNowMs(nowMs: number, offsetHours: number) {
  return nowMs + offsetHours * 60 * 60 * 1000;
}

/**
 * Deterministic demo alerts — replace with streaming telematics / weather APIs later.
 * Tied to `mock-data` personas so the pitch stays reproducible when Maria scrubs the timeline.
 */
export function buildProactiveAlerts(input: AlertInputs): ProactiveAlert[] {
  const { drivers, openLoads, nowMs, offsetHours } = input;
  const t = simNowMs(nowMs, offsetHours);
  const list: ProactiveAlert[] = [];

  const byId = (id: string) => drivers.find((d) => d.id === id);

  // —— Open loads: pickup risk before the customer calls ——
  for (const load of openLoads) {
    const msLeft = load.pickupDeadline - t;
    const hLeft = msLeft / 3600000;
    if (msLeft < 0) {
      list.push({
        id: `deadline-missed-${load.id}`,
        kind: "deadline",
        severity: "critical",
        title: `Missed pickup window · ${load.id}`,
        detail: `${load.origin} → ${load.destination} — dispatch another truck or renegotiate the appointment.`,
        loadId: load.id,
      });
    } else if (hLeft < 0.5) {
      list.push({
        id: `deadline-critical-${load.id}`,
        kind: "deadline",
        severity: "critical",
        title: `Pickup in <30m · ${load.id}`,
        detail: `${load.origin} — no driver locked yet. Customer visibility will lag if this slips.`,
        loadId: load.id,
      });
    } else if (hLeft < 1.5) {
      list.push({
        id: `deadline-warn-${load.id}`,
        kind: "deadline",
        severity: "warning",
        title: `Pickup window tight · ${load.id}`,
        detail: `${load.origin} → ${load.destination} — assign before HOS and deadhead eat the margin.`,
        loadId: load.id,
      });
    }
  }

  // —— In motion: ETA slip vs plan ——
  const d2 = byId("d2");
  if (d2?.ringStatus === "en_route" && offsetHours > 1.1 && offsetHours < 8) {
    list.push({
      id: "eta-slip-d2",
      kind: "delay",
      severity: "warning",
      title: "ETA slip vs plan",
      detail: `${d2.name} — +18–26m on I-10 PHX approach (congestion + merge). Customer ETA auto-updated.`,
      driverId: d2.id,
    });
  }

  // —— Route deviation (demo window: scrub timeline ~2–6h to surface it) ——
  const d6 = byId("d6");
  if (d6?.ringStatus === "en_route" && offsetHours > 2 && offsetHours < 6) {
    list.push({
      id: "deviation-d6",
      kind: "deviation",
      severity: "warning",
      title: "Route deviation detected",
      detail: `${d6.name} — >6 mi off planned corridor near PHX. Confirm detour vs reroute.`,
      driverId: d6.id,
    });
  }

  // —— Long idle (customer sees “stopped”) ——
  const d10 = byId("d10");
  if (d10 && offsetHours > 0.35 && offsetHours < 12) {
    list.push({
      id: "idle-d10",
      kind: "idle",
      severity: "info",
      title: "Unusual dwell time",
      detail: `${d10.name} — no meaningful GPS movement 48m (Kingman). Check dock / breakdown.`,
      driverId: d10.id,
    });
  }

  // —— Weather overlay ——
  if (offsetHours >= 0) {
    list.push({
      id: "weather-flag-storm",
      kind: "weather",
      severity: "info",
      title: "Wind advisory · northern AZ",
      detail:
        "I-40 Flagstaff corridor: gusts 35–45 mph through late afternoon. Expect +12–20m on mountain legs.",
    });
  }

  // —— Telematics fault hint ——
  const d15 = byId("d15");
  if (d15 && offsetHours > 2.8) {
    list.push({
      id: "breakdown-d15",
      kind: "breakdown",
      severity: "warning",
      title: "Sensor anomaly · tire / wheel",
      detail: `${d15.name} — vibration spike on drive axle. Suggest inspection before next load.`,
      driverId: d15.id,
    });
  }

  // —— HOS cliff — cap so scrubbing forward doesn’t flood the feed ——
  const hosRisk = drivers.filter(
    (d) =>
      (d.ringStatus === "available" ||
        d.ringStatus === "en_route" ||
        d.ringStatus === "constrained") &&
      d.hosRemainingHours >= 0.4 &&
      d.hosRemainingHours < 1.35,
  );
  hosRisk.sort((a, b) => a.hosRemainingHours - b.hosRemainingHours);
  for (const d of hosRisk.slice(0, 2)) {
    list.push({
      id: `hos-cliff-${d.id}`,
      kind: "hos",
      severity: "warning",
      title: "HOS cliff soon",
      detail: `${d.name} — ${d.hosRemainingHours.toFixed(1)}h left on cycle. Reroute or plan reset before the next leg.`,
      driverId: d.id,
    });
  }

  const severityOrder: Record<ProactiveAlert["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  list.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return list;
}
