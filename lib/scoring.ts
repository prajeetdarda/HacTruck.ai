import type {
  Driver,
  DriverLoadFeatures,
  Load,
  RankedDriver,
  RejectTag,
} from "./types";

const MAP_SCALE_MILES = 2.8; // fake miles per SVG unit — believable dispatch distances

export function distanceMiles(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy) * MAP_SCALE_MILES;
}

function equipmentMatch(load: Load, driver: Driver): number {
  return load.equipment === driver.equipment ? 1 : 0;
}

/**
 * Pure feature extraction — swap `scoreFromFeatures` later for Claude / API.
 */
export function extractFeatures(
  load: Load,
  driver: Driver,
): DriverLoadFeatures {
  const distanceToPickupMiles = distanceMiles(
    driver.x,
    driver.y,
    load.pickupX,
    load.pickupY,
  );
  return {
    loadId: load.id,
    driverId: driver.id,
    distanceToPickupMiles,
    hosRemaining: driver.hosRemainingHours,
    equipmentMatch: equipmentMatch(load, driver),
    laneFamiliarity: driver.laneFamiliarity / 100,
    costPerMile: driver.costPerMile,
    currentLoadEndingSoon: (driver.currentLoadEndingInHours ?? 99) < 3,
    ringStatus: driver.ringStatus,
    hasActiveConflict: !!driver.hasActiveConflict,
  };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** Mock model — replace with API call using same `DriverLoadFeatures` shape */
export function scoreFromFeatures(f: DriverLoadFeatures): {
  score: number;
  matchPercent: number;
  reasons: string[];
  rejectTags: RejectTag[];
} {
  const rejectTags: RejectTag[] = [];

  if (f.hasActiveConflict) rejectTags.push("conflict");
  if (f.equipmentMatch < 0.5) rejectTags.push("wrong_equipment");
  if (f.ringStatus === "inactive") rejectTags.push("off_duty");
  if (f.ringStatus === "urgent") rejectTags.push("low_hos");
  if (f.distanceToPickupMiles > 420) rejectTags.push("too_far");
  if (f.hosRemaining < 2.5 && f.ringStatus !== "inactive")
    rejectTags.push("low_hos");

  let score = 50;

  score += clamp(28 - f.distanceToPickupMiles * 0.045, -20, 28);
  score += clamp(f.hosRemaining * 2.2, 0, 22);
  score += f.equipmentMatch * 18;
  score += f.laneFamiliarity * 14;
  score += clamp((2.15 - f.costPerMile) * 18, -12, 12);

  if (f.ringStatus === "inactive") score -= 80;
  if (f.ringStatus === "urgent") score -= 85;
  if (f.ringStatus === "watch") {
    if (f.currentLoadEndingSoon) score += 8;
    else score -= 9;
  }
  if (f.hasActiveConflict) score -= 70;
  if (f.equipmentMatch < 0.5) score -= 55;
  if (f.distanceToPickupMiles > 380) score -= 25;
  if (f.hosRemaining < 2 && f.ringStatus !== "inactive") score -= 35;

  const reasons: string[] = [];

  if (f.equipmentMatch >= 1)
    reasons.push("Equipment match for this load");
  else reasons.push("Equipment mismatch — deprioritized");

  if (f.distanceToPickupMiles < 120)
    reasons.push("Very close to pickup window");
  else if (f.distanceToPickupMiles < 220)
    reasons.push("Reasonable deadhead to pickup");
  else reasons.push("Longer reposition to pickup");

  if (f.laneFamiliarity > 0.75)
    reasons.push("Strong lane history on this corridor");
  else if (f.laneFamiliarity > 0.5)
    reasons.push("Some familiarity with lane");
  else reasons.push("Limited lane history");

  if (f.hosRemaining >= 8) reasons.push("Healthy HOS buffer");
  else if (f.hosRemaining >= 4)
    reasons.push("Adequate HOS — watch resets");
  else reasons.push("Tight HOS — higher risk");

  if (f.costPerMile < 1.85) reasons.push("Competitive cost per mile");
  else reasons.push("Slightly elevated CPM");

  if (f.currentLoadEndingSoon && f.ringStatus === "watch")
    reasons.push("Finishes current route soon — good sequencing");

  if (f.hasActiveConflict) reasons.push("Active dispatch conflict on file");

  const matchPercent = clamp(Math.round(score), 0, 100);

  return {
    score: clamp(score, 0, 100),
    matchPercent,
    reasons: reasons.slice(0, 4),
    rejectTags,
  };
}

export function rankDriversForLoad(
  load: Load,
  drivers: Driver[],
): RankedDriver[] {
  const ranked: RankedDriver[] = drivers.map((driver) => {
    const features = extractFeatures(load, driver);
    const { score, matchPercent, reasons, rejectTags } =
      scoreFromFeatures(features);
    return {
      driver,
      score,
      matchPercent,
      reasons,
      rejectTags,
      features,
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

const ASSIGN_DRAG_BLOCK: RejectTag[] = [
  "wrong_equipment",
  "off_duty",
  "conflict",
];

/** Drag-drop / one-click assign is blocked for these hard rejects. */
export function rankedAllowsAssignment(r: RankedDriver | undefined): boolean {
  if (!r) return true;
  return !r.rejectTags.some((t) => ASSIGN_DRAG_BLOCK.includes(t));
}

/** Short AI blurb for comparison tray */
export function shortAiReason(r: RankedDriver, rank: number): string {
  const f = r.features;
  const endH = r.driver.currentLoadEndingInHours;
  if (rank === 1 && f.laneFamiliarity > 0.8 && f.equipmentMatch >= 1)
    return "Best pick — knows this lane";
  if (f.currentLoadEndingSoon && f.ringStatus === "watch" && endH != null)
    return `Finishes current route in ${endH < 1 ? "<1" : endH.toFixed(1)}h`;
  if (f.hosRemaining < 4 && f.hosRemaining > 0 && rank <= 3)
    return "Closer but lower HOS";
  if (f.distanceToPickupMiles < 150 && rank <= 2)
    return "Strong proximity to pickup";
  if (r.rejectTags.length > 0) return "See fit issues — still listed";
  return r.reasons[0] ?? "Balanced match";
}
