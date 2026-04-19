# HacTruck.ai — Datasets, recommendations, and alerts

This document describes the **mock datasets**, **coordinate/distance model**, **simulation**, **driver–load scoring (recommendations)**, and **proactive alerts** as implemented in the codebase.

---

## 1. Where the data lives

- **Primary source:** `lib/mock-data.ts` — static **loads** and **drivers** used by the UI, scoring, and alerts.
- **Runtime state:** assignments and timeline scrubbing in `DispatchProvider` (and related components) — does **not** persist changes back into `mock-data.ts`.
- **API stubs:** `lib/server/fleet-repository.ts` mirrors the same static lists for server-side stubs (no external database in the demo).

---

## 2. Loads (`LOADS`)

**Count:** 5 loads (`L-1001` … `L-1005`).

| Field | Role |
|--------|------|
| `id` | Stable string identifier |
| `origin` / `destination` | Human-readable lane labels (Arizona-centric + one Las Vegas leg) |
| `equipment` | `dry_van`, `reefer`, or `flatbed` — must align with driver equipment in scoring |
| `revenue` | Dollar amount for UI / context |
| `pickupDeadline` | `Date` — typically `Date.now()` at module load + offset; drives **urgency** in inbox and **deadline alerts** |
| `pickupX`, `pickupY` | Positions in **SVG map space** (see `geo-bridge`), derived from real-ish AZ coordinates |

**Design intent:** Varied equipment, deadlines, and lanes so ranking, urgency, and map distance look plausible in a hackathon demo.

---

## 3. Drivers (`DRIVERS`)

**Count:** 15 drivers (`d1` … `d15`).

| Field | Role |
|--------|------|
| `x`, `y` | Position in the **same SVG space** as load pickups — used for **deadhead** in scoring |
| `ringStatus` | e.g. `available`, `constrained`, `unavailable`, `en_route`, `off_duty` — affects penalties, reject tags, and map styling |
| `equipment` | Must match load equipment for a valid assignment in scoring |
| `hosRemainingHours` / `hosMaxHours` | Hours-of-service; scoring + alerts; **simulation** can reduce remaining HOS when the timeline moves |
| `laneFamiliarity` | 0–100; normalized in feature extraction |
| `costPerMile` | Lower is better in the heuristic |
| `laneHistoryCount` | UI / narrative (“experience”) |
| `currentLoadEndingInHours` | Optional; supports sequencing bonus for en-route drivers finishing soon |
| `enRoutePath` | Optional polyline in SVG coords — map display + simulated motion along the path |
| `hasActiveConflict` | Demo flag — strong penalty + `conflict` reject tag where used |

**Design intent:** Mix statuses, equipment, en-route paths, and edge cases (e.g. conflict) to stress ranking, reject reasons, and scripted alerts.

---

## 4. Coordinates and distance

- **Geo → SVG:** `geo-bridge` maps WGS84 to SVG coordinates for consistent placement.
- **Scoring “miles”:** Euclidean distance in SVG units × **`MAP_SCALE_MILES`** (see `lib/scoring.ts`) — **not** real road distance or a routing matrix.

The dataset is **synthetic but internally consistent** for the demo.

---

## 5. Simulation (`lib/simulation.ts`)

When a load is selected and/or the **timeline** scrubs forward:

- **Position:** Interpolates along `enRoutePath` if present; otherwise may nudge toward the selected load’s pickup; otherwise static.
- **HOS:** Reduces remaining hours as simulated time advances (floored at zero).
- **Ring / status display:** May push drivers toward `unavailable` or `constrained` when HOS is low.

The result is a **simulated driver snapshot** (`driversSimulated`) used for ranking and alerts without editing `mock-data.ts` on disk.

---

## 6. Recommendations — core logic (`lib/scoring.ts`)

### 6.1 Feature extraction

**`extractFeatures(load, driver)`** builds **`DriverLoadFeatures`**, including:

- Deadhead miles (from SVG distance × scale)
- HOS headroom vs need
- Equipment match (0/1)
- Lane familiarity (normalized)
- Cost per mile
- Whether the driver is finishing a current leg soon (en-route sequencing)
- Ring status and conflict flags

### 6.2 Scoring and reject tags

**`scoreFromFeatures`** applies a **hand-tuned heuristic** (documented in code as replaceable by an API or ML):

- Baseline score plus adjustments for distance, HOS, equipment, lane, CPM, en-route bonus, and **heavy penalties** for off duty, unavailable, conflict, wrong equipment, excessive deadhead, or insufficient HOS.
- **`rejectTags`:** hard gates such as `wrong_equipment`, `too_far`, `low_hos`, `off_duty`, `conflict` — **deduplicated**.
- **`reasons`:** short human-readable strings for UI.
- **`matchPercent`:** derived from the numeric score (typically clamped 0–100).

### 6.3 Ranking and “best” driver

**`rankDriversForLoad`:**

1. Sort drivers with **no reject tags first**, then **higher score**.
2. So rank **#1** is the best assignable driver if any are feasible; otherwise the least-bad among flagged candidates.

**`pickBestAssignable`** returns **`ranked[0]`** after that sort.

### 6.4 UI and assignments

- Comparison tray, “assign best fit,” and map rankings consume this ranked list.
- **`state.assignments`** is separate from mock data; UI logic (e.g. **active drivers**) may **exclude** drivers already assigned so counts reflect who is still free on the board.

---

## 7. Proactive alerts — core logic (`lib/alerts.ts`)

**`buildProactiveAlerts`** is **rule-based and deterministic** (demo). Comments note it can be swapped for telematics, weather APIs, etc.

**Inputs:** drivers (often simulated), open/unassigned loads, `nowMs`, and timeline **`offsetHours`**.

### Alert categories (conceptual)

| Kind | Behavior (simplified) |
|------|------------------------|
| **deadline** | Per **open** load: time remaining vs `pickupDeadline` → tiers (e.g. missed, <30m, <1.5h) with severity |
| **delay** | Scripted driver (e.g. **d2**), en_route, within a scrub window → ETA slip narrative |
| **deviation** | Scripted driver (e.g. **d6**), en_route, within a window → route deviation |
| **idle** | Scripted driver (e.g. **d10**), after enough scrub → long dwell |
| **weather** | When `offsetHours ≥ 0` → wind advisory (demo info alert) |
| **breakdown** | Scripted driver (e.g. **d15**), after scrub threshold → maintenance-style alert |
| **hos** | Among eligible drivers, up to **2** with low remaining HOS in a band — lowest first |

Output alerts are typically **sorted by severity** (e.g. critical → warning → info).

---

## 8. Quick reference

| Piece | Source | Notes |
|--------|--------|--------|
| Loads | `LOADS` in `lib/mock-data.ts` | 5 lanes, deadlines, equipment, SVG pickups |
| Drivers | `DRIVERS` in `lib/mock-data.ts` | 15 rows; mixed status, equipment, optional paths |
| Distance | Derived in scoring | SVG distance × scale — not Mapbox matrix |
| Live ranking | `lib/scoring.ts` + simulated drivers | Heuristic + reject tags + two-level sort |
| Alerts | `lib/alerts.ts` | Rules + deadlines on open loads + scripted IDs |
| Assignments | In-memory app state | Does not mutate `mock-data.ts` |

---

## 9. Extension points

- **Recommendations:** Replace or wrap **`extractFeatures`** / **`scoreFromFeatures`** and the **`DriverLoadFeatures`** shape while keeping ranking and UI contracts stable.
- **Alerts:** Replace **`buildProactiveAlerts`** with real telemetry/weather while preserving the **`ProactiveAlert`** (or equivalent) type expected by the UI.

---

## 10. Key files

| File | Purpose |
|------|---------|
| `lib/mock-data.ts` | Loads, drivers, geo-derived positions |
| `lib/scoring.ts` | Features, score, reject tags, ranking |
| `lib/alerts.ts` | Proactive alert generation |
| `lib/simulation.ts` | Timeline-driven position and HOS updates |
| `components/providers/DispatchProvider.tsx` | Wires alerts, assignments, simulated drivers |
