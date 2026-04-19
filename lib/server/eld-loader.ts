/**
 * ELD data loader. Reads the FMCSA-format mock log we shipped at
 * `data/eld-data.json` (generated from `ELD_Mock_Data.xlsx`) and computes
 * Hours-of-Service state per driver at any point in time.
 *
 * Time anchor: the mock log is a static window (Apr 2–5, 2026). All HOS
 * calculations are relative to a reference timestamp the caller supplies,
 * defaulting to `getEldNow()` (the latest event in the log). To drive HOS
 * from the dispatcher's timeline scrubber, pass:
 *     getEldNow() + simulatedHoursOffset * 3_600_000
 */

import fs from "node:fs";
import path from "node:path";

// ---------- Raw shapes (match data/eld-data.json) ----------

type RawHosEvent = {
  eventSeqId: string;
  dutyStatus:
    | "Driving"
    | "On Duty (Not Driving)"
    | "Off Duty"
    | "Sleeper Berth";
  eventType: number;
  eventCode: number;
  ts: number; // unix ms
  lat: number;
  lng: number;
  accumVehicleMiles: number;
  accumEngineHours: number;
  distSinceLastCoords: number;
  cmvOrder: number;
  username: string;
  malfunctionIndicator: 0 | 1;
};

type RawMalfunction = {
  eventSeqId: string;
  kind: "Malfunction" | "Diagnostic";
  eventCode: string;
  description: string;
  ts: number;
  lat: number;
  lng: number;
  cmvOrder: number;
  username: string;
};

type RawUser = {
  userOrder: number;
  firstName: string;
  lastName: string;
  username: string;
  licenseState: string;
  licenseNumber: string;
};

type RawCmv = {
  cmvOrder: number;
  powerUnit: string;
  vin: string;
  make: string;
  modelYear: number;
  assignedDriverLastName: string;
};

type EldPayload = {
  sourceFile: string;
  generatedAt: number;
  eldDataMaxTs: number;
  eldDataMinTs: number;
  users: RawUser[];
  cmvs: RawCmv[];
  hosEvents: RawHosEvent[];
  malfunctions: RawMalfunction[];
};

// ---------- Public types ----------

export type DutyStatus = RawHosEvent["dutyStatus"];

export type HosState = {
  username: string;
  /** Latest ELD event location at-or-before the reference time. */
  lastPosition: { lat: number; lng: number };
  /** Timestamp (unix ms) of the event that produced lastPosition. */
  lastEventTs: number;
  /** Duty status at the reference time (carried forward from last event). */
  dutyStatus: DutyStatus;
  /** Hours driven inside the trailing 14h driving window. */
  driveTimeUsedH: number;
  /** 11h rule remaining. Clamped at 0. */
  driveTimeRemainingH: number;
  /** On-duty hours (Driving + On Duty Not Driving) inside trailing 8 days. */
  cycleUsedH: number;
  /** 70h/8d rule remaining. Clamped at 0. */
  cycleRemainingH: number;
  /** Active malfunction codes seen in the trailing 24h. */
  activeMalfunctionCodes: string[];
  /** "violation" when remaining hits 0; "warn" under 1.5h; else "ok". */
  hosRiskLevel: "ok" | "warn" | "violation";
};

export type DriverProfile = {
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  licenseState: string;
  licenseNumber: string;
};

// ---------- Module-level cache ----------

let cached: EldPayload | null = null;

function load(): EldPayload {
  if (cached) return cached;
  // Project convention: /data lives at the repo root.
  const p = path.join(process.cwd(), "data", "eld-data.json");
  const text = fs.readFileSync(p, "utf8");
  cached = JSON.parse(text) as EldPayload;
  return cached;
}

// ---------- Public helpers ----------

/** Anchor for HOS calculations: latest event timestamp in the log (unix ms). */
export function getEldNow(): number {
  return load().eldDataMaxTs;
}

/** Reverse helper for the front-end clock: how far the ELD log lags real time. */
export function getEldClockSkewMs(): number {
  return load().eldDataMaxTs - Date.now();
}

export function listDriverProfiles(): DriverProfile[] {
  return load().users.map((u) => ({
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`,
    licenseState: u.licenseState,
    licenseNumber: u.licenseNumber,
  }));
}

/**
 * HOS state for one driver at `atTs` (default = ELD-now). The function walks
 * the driver's events in order and integrates duty-status durations against
 * the relevant rolling windows (14h for the 11h rule; 8d for the 70h rule).
 */
export function getDriverHosState(
  username: string,
  atTs: number = getEldNow(),
): HosState | null {
  const data = load();
  const events = data.hosEvents
    .filter((e) => e.username === username && e.ts <= atTs)
    .sort((a, b) => a.ts - b.ts);
  if (events.length === 0) return null;

  const last = events[events.length - 1]!;
  const dutyStatus = last.dutyStatus;
  const lastPosition = { lat: last.lat, lng: last.lng };

  const window14hStart = atTs - 14 * 3_600_000;
  const window8dStart = atTs - 8 * 24 * 3_600_000;

  // Build pairs of (segmentStart, segmentEnd, duty) from consecutive events,
  // plus a final open segment from the last event up to atTs.
  const segments: Array<{ start: number; end: number; duty: DutyStatus }> = [];
  for (let i = 0; i < events.length - 1; i++) {
    segments.push({
      start: events[i]!.ts,
      end: events[i + 1]!.ts,
      duty: events[i]!.dutyStatus,
    });
  }
  segments.push({ start: last.ts, end: atTs, duty: last.dutyStatus });

  const overlap = (s: number, e: number, ws: number) =>
    Math.max(0, e - Math.max(s, ws));

  let driveTimeUsedMs = 0;
  let cycleUsedMs = 0;
  for (const seg of segments) {
    if (seg.end <= seg.start) continue;
    if (seg.duty === "Driving") {
      driveTimeUsedMs += overlap(seg.start, seg.end, window14hStart);
    }
    if (seg.duty === "Driving" || seg.duty === "On Duty (Not Driving)") {
      cycleUsedMs += overlap(seg.start, seg.end, window8dStart);
    }
  }

  const driveTimeUsedH = driveTimeUsedMs / 3_600_000;
  const cycleUsedH = cycleUsedMs / 3_600_000;
  const driveTimeRemainingH = Math.max(0, 11 - driveTimeUsedH);
  const cycleRemainingH = Math.max(0, 70 - cycleUsedH);

  const malfWindow = atTs - 24 * 3_600_000;
  const activeMalfunctionCodes = data.malfunctions
    .filter(
      (m) =>
        m.username === username &&
        m.kind === "Malfunction" &&
        m.ts <= atTs &&
        m.ts >= malfWindow,
    )
    .map((m) => m.eventCode);

  const hosRiskLevel: HosState["hosRiskLevel"] =
    driveTimeRemainingH <= 0
      ? "violation"
      : driveTimeRemainingH < 1.5
        ? "warn"
        : "ok";

  return {
    username,
    lastPosition,
    lastEventTs: last.ts,
    dutyStatus,
    driveTimeUsedH,
    driveTimeRemainingH,
    cycleUsedH,
    cycleRemainingH,
    activeMalfunctionCodes,
    hosRiskLevel,
  };
}

/** Convenience: HOS state for every driver in the log at one timestamp. */
export function getAllHosStates(atTs: number = getEldNow()): HosState[] {
  return listDriverProfiles()
    .map((p) => getDriverHosState(p.username, atTs))
    .filter((s): s is HosState => s !== null);
}
