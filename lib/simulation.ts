import type { Driver, Load } from "./types";

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
  if (driver.ringStatus === "inactive" || driver.ringStatus === "urgent") {
    return driver.ringStatus;
  }
  if (hos < 1.5) return "urgent";
  if (hos < 4) return "watch";
  return driver.ringStatus;
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
  return {
    ...driver,
    x: pos.x,
    y: pos.y,
    hosRemainingHours: hos,
    ringStatus: ring,
  };
}
