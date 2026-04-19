import { activeSituationForDriver, apply511RingOverride } from "./demo-511-situations";
import { fleetSummaryRing, type Driver, type Load } from "./types";

const HOS_DEPLETE_PER_HOUR = 0.35; // simulated duty burn when scrubbing forward

/** Linear interpolate */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Fake projected position: nudge driver toward pickup or along en-route path.
 */
export function getSimulatedPosition(
  driver: Driver,
  load: Load | null,
  offsetHours: number,
): { x: number; y: number } {
  const t = Math.min(1, offsetHours / 24);
  if (driver.enRoutePath && driver.enRoutePath.length >= 2) {
    const path = driver.enRoutePath;
    const seg = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
    const localT = (t * (path.length - 1)) % 1;
    const p0 = path[seg]!;
    const p1 = path[seg + 1]!;
    return {
      x: lerp(p0.x, p1.x, localT),
      y: lerp(p0.y, p1.y, localT),
    };
  }
  if (load) {
    return {
      x: lerp(driver.x, load.pickupX, t * 0.4),
      y: lerp(driver.y, load.pickupY, t * 0.4),
    };
  }
  return { x: driver.x, y: driver.y };
}

export function getSimulatedHos(driver: Driver, offsetHours: number): number {
  const raw = driver.hosRemainingHours - offsetHours * HOS_DEPLETE_PER_HOUR;
  return Math.max(0, raw);
}

export function isLoadOverdue(
  load: Load,
  offsetHours: number,
  nowMs: number,
): boolean {
  const simNow = nowMs + offsetHours * 60 * 60 * 1000;
  return simNow > load.pickupDeadline;
}

/** Display-only ring status after timeline scrub */
export function getDisplayRingStatus(
  driver: Driver,
  offsetHours: number,
): Driver["ringStatus"] {
  const hos = getSimulatedHos(driver, offsetHours);
  const base = driver.ringStatus;
  if (
    base === "inactive" ||
    base === "urgent" ||
    base === "off_duty" ||
    base === "unavailable"
  ) {
    return base;
  }
  if (hos < 1.5) return "urgent";
  if (hos < 4) return "watch";
  return base;
}

/**
 * Human-readable factors for the current urgent/watch ring (HOS scrub, 511, dispatch flags).
 * Use with the raw `DRIVERS` row as `baseDriver` and `driverForSimulation` output as `simulated`.
 */
export function getDriverStatusExplanation(
  baseDriver: Driver,
  simulated: Driver,
  offsetHours: number,
): string[] {
  const summary = fleetSummaryRing(simulated.ringStatus);
  if (summary !== "urgent" && summary !== "watch") {
    return [];
  }

  const reasons: string[] = [];
  const hos = getSimulatedHos(baseDriver, offsetHours);
  const ringAfterHos = getDisplayRingStatus(baseDriver, offsetHours);
  const sit = activeSituationForDriver(baseDriver.id, offsetHours);
  const base = baseDriver.ringStatus;

  if (sit) {
    reasons.push(
      sit.severity === "critical"
        ? `511 advisory (critical): ${sit.headline}`
        : `511 advisory: ${sit.headline}`,
    );
  }

  const frozen =
    base === "inactive" ||
    base === "urgent" ||
    base === "off_duty" ||
    base === "unavailable";

  if (!frozen) {
    if (hos < 1.5 && ringAfterHos === "urgent") {
      reasons.push(
        `Remaining HOS is about ${hos.toFixed(1)}h on the scrubbed timeline (under 1.5h → urgent).`,
      );
    } else if (hos >= 1.5 && hos < 4 && ringAfterHos === "watch") {
      reasons.push(
        `Remaining HOS is about ${hos.toFixed(1)}h on the scrubbed timeline (under 4h → watch).`,
      );
    }
  }

  if (base === "urgent") {
    reasons.push("Flagged urgent in fleet records.");
  } else if (base === "constrained") {
    reasons.push("Marked constrained — tight capacity or routing limits.");
  } else if (base === "en_route" && ringAfterHos === "en_route") {
    reasons.push("On an active load (en route) — watch bucket.");
  }

  if (reasons.length === 0) {
    reasons.push("Ring reflects dispatch status and timeline scrub (HOS / 511 rules).");
  }

  return reasons;
}

/** Shallow driver snapshot for map + ranking while scrubbing */
export function driverForSimulation(
  driver: Driver,
  selectedLoad: Load | null,
  offsetHours: number,
): Driver {
  const pos = getSimulatedPosition(driver, selectedLoad, offsetHours);
  const hos = getSimulatedHos(driver, offsetHours);
  const ring = getDisplayRingStatus(driver, offsetHours);
  return apply511RingOverride(
    {
      ...driver,
      x: pos.x,
      y: pos.y,
      hosRemainingHours: hos,
      ringStatus: ring,
    },
    offsetHours,
  );
}
