"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FLEET_NAME, TERMINAL, listAlerts } from "@/lib/backend-db";
import {
  countDriversByFleetSummaryRing,
  DRIVER_RING_LABEL,
  fleetSummaryRing,
  type Driver,
  type EquipmentType,
  type FleetSummaryRing,
} from "@/lib/types";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Z_MAP } from "@/lib/layout-tokens";

const RING_ORDER: FleetSummaryRing[] = [
  "urgent",
  "watch",
  "good",
  "inactive",
];

const RING_CLASS: Record<FleetSummaryRing, string> = {
  urgent: "text-rose-400 dark:text-rose-400",
  watch: "text-amber-400 dark:text-amber-400",
  good: "text-emerald-400 dark:text-emerald-400",
  inactive: "text-zinc-500 dark:text-zinc-500",
};

/** Dropdown menu — status chips + avatars align with fleet “ring” semantics. */
const RING_STATUS_CHIP: Record<FleetSummaryRing, string> = {
  urgent:
    "border border-rose-400/35 bg-gradient-to-r from-rose-500/20 to-rose-600/10 text-rose-800 dark:border-rose-500/40 dark:text-rose-300",
  watch:
    "border border-amber-400/35 bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-900 dark:border-amber-500/40 dark:text-amber-300",
  good:
    "border border-emerald-400/35 bg-gradient-to-r from-emerald-500/18 to-teal-600/10 text-emerald-900 dark:border-emerald-500/35 dark:text-emerald-300",
  inactive:
    "border border-zinc-400/25 bg-gradient-to-r from-zinc-500/15 to-zinc-600/10 text-zinc-700 dark:border-zinc-500/30 dark:text-zinc-400",
};

const RING_AVATAR: Record<FleetSummaryRing, string> = {
  urgent:
    "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-[0_2px_8px_rgba(244,63,94,0.45)]",
  watch:
    "bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-[0_2px_8px_rgba(245,158,11,0.4)]",
  good:
    "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_2px_8px_rgba(52,211,153,0.4)]",
  inactive:
    "bg-gradient-to-br from-zinc-400 to-zinc-600 text-white shadow-[0_2px_8px_rgba(113,113,122,0.35)]",
};

const EQUIPMENT_MENU: Record<
  EquipmentType,
  { label: string; chip: string }
> = {
  dry_van: {
    label: "Dry van",
    chip:
      "border border-sky-400/25 bg-sky-500/12 text-sky-800 dark:border-sky-500/35 dark:text-sky-300",
  },
  reefer: {
    label: "Reefer",
    chip:
      "border border-cyan-400/25 bg-cyan-500/12 text-cyan-900 dark:border-cyan-500/35 dark:text-cyan-300",
  },
  flatbed: {
    label: "Flatbed",
    chip:
      "border border-orange-400/30 bg-orange-500/12 text-orange-900 dark:border-orange-500/35 dark:text-orange-300",
  },
};

function hosAccent(hours: number): string {
  if (hours <= 2) return "text-rose-500 dark:text-rose-400";
  if (hours <= 5) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function TopBar() {
  const {
    openLoads,
    activeDriverCount,
    selectedLoad,
    driversSimulated,
    driversBase,
    loadInboxExpanded,
    state,
    setMapRingFilter,
    selectDriver,
    setLoadInboxExpanded,
    setLoadPinsOnMap,
  } = useDispatchContext();
  const { theme, toggleTheme } = useTheme();
  /** null until mount — avoids SSR/client clock mismatch (hydration error). */
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr =
    now == null
      ? "--:--:-- --"
      : now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

  const ringCounts = useMemo(
    () => countDriversByFleetSummaryRing(driversSimulated),
    [driversSimulated],
  );

  const tripAlertBoardCount = useMemo(
    () => listAlerts(state.simulatedHoursOffset).length,
    [state.simulatedHoursOffset],
  );

  const showFleetStrip =
    !selectedLoad && !loadInboxExpanded;

  return (
    <header
      className="relative flex min-h-[52px] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-1)]/95 px-4 py-2 backdrop-blur-md sm:gap-4 sm:px-5"
      style={{ zIndex: Z_MAP + 10 }}
    >
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.75)]" />
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--muted)] sm:inline">
            Live ops
          </span>
        </motion.div>
        <div className="hidden h-6 w-px shrink-0 bg-[var(--border)] sm:block" />
        <div className="min-w-0">
          <h1 className="max-w-[140px] truncate text-sm font-semibold tracking-tight text-[var(--foreground)] sm:max-w-none sm:text-base">
            {FLEET_NAME}
          </h1>
          <p
            className="mt-0.5 hidden max-w-[min(280px,40vw)] truncate text-[10px] text-zinc-500 dark:text-zinc-500 sm:block"
            title={TERMINAL.name}
          >
            {TERMINAL.name}
          </p>
        </div>
      </div>

      {showFleetStrip ? (
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-2">
          <div
            className="hidden max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center text-[11px] leading-snug sm:flex"
            aria-live="polite"
            role="toolbar"
            aria-label="Fleet status by ring — numbers are trucks on the map; tap a ring to show only those trucks"
          >
            <span className="inline-flex shrink-0 items-center gap-2">
              <span
                className="relative flex h-2 w-2 shrink-0"
                aria-hidden
                title="Live feed"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/55 motion-reduce:animate-none dark:bg-sky-400/45" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.65)] dark:bg-sky-400" />
              </span>
              <span className="font-semibold uppercase tracking-[0.14em] text-zinc-600 motion-safe:animate-[live-label_2.4s_ease-in-out_infinite] dark:text-zinc-400">
                Fleet status
              </span>
            </span>
            {RING_ORDER.map((ring) => (
              <span
                key={ring}
                className="inline-flex shrink-0 items-center gap-x-1 text-zinc-500 dark:text-zinc-600"
              >
                <span aria-hidden className="select-none">
                  ●
                </span>
                <button
                  type="button"
                  disabled={ringCounts[ring] === 0}
                  onClick={() => setMapRingFilter(ring)}
                  title={
                    state.mapRingFilter === ring
                      ? `Clear ${ring} focus`
                      : `${ringCounts[ring]} truck${ringCounts[ring] === 1 ? "" : "s"} in ${ring} (map + driver panel)`
                  }
                  className={clsx(
                    "rounded-md px-1.5 py-0.5 tabular-nums outline-none transition-colors",
                    "hover:bg-black/[0.06] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                    "disabled:pointer-events-none disabled:opacity-35 dark:hover:bg-white/[0.06]",
                    RING_CLASS[ring],
                    state.mapRingFilter === ring &&
                      "bg-black/[0.08] ring-1 ring-current/35 dark:bg-white/[0.08]",
                  )}
                >
                  {ringCounts[ring]} {ring}
                </button>
              </span>
            ))}
            {tripAlertBoardCount > 0 ? (
              <span
                className="shrink-0 text-[10px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500"
                title="In-transit trip alerts in the board (open a truck’s detail to review). Ring counts above are trucks only."
              >
                · {tripAlertBoardCount} trip alert
                {tripAlertBoardCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}

      <div className="ml-auto flex shrink-0 items-end gap-4 sm:gap-8">
        <ActiveDriversMenu
          count={activeDriverCount}
          drivers={driversBase}
          onPickDriver={(id) => selectDriver(id)}
        />
        <button
          type="button"
          onClick={() => {
            setLoadInboxExpanded(true);
            setLoadPinsOnMap(true);
          }}
          className="pb-0.5 text-left outline-none transition-opacity hover:opacity-90 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
          aria-label={`Open load inbox, ${openLoads.length} open loads`}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Open loads
          </div>
          <div className="text-lg font-semibold tabular-nums leading-none text-amber-400 sm:text-xl">
            {openLoads.length}
          </div>
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-1)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="hidden pb-0.5 text-right sm:block">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Local time
          </div>
          <div className="font-mono text-sm tabular-nums leading-none text-[var(--foreground)]">
            {timeStr}
          </div>
        </div>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function isActiveDriver(d: Driver): boolean {
  return d.ringStatus !== "off_duty" && d.ringStatus !== "unavailable";
}

function ActiveDriversMenu({
  count,
  drivers,
  onPickDriver,
}: {
  count: number;
  drivers: Driver[];
  onPickDriver: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const listed = useMemo(() => {
    return [...drivers].filter(isActiveDriver).sort((a, b) => {
      const n = a.name.localeCompare(b.name);
      if (n !== 0) return n;
      return a.id.localeCompare(b.id);
    });
  }, [drivers]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative pb-0.5">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="active-drivers-menu"
        id="active-drivers-trigger"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-w-[86px] flex-col items-stretch gap-0.5 text-left outline-none transition-opacity hover:opacity-90 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
      >
        <span className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Active drivers
          </span>
          <ChevronIcon className="mb-0.5 size-3 shrink-0 text-[var(--muted)]" open={open} />
        </span>
        <span className="text-lg font-semibold tabular-nums leading-none text-sky-400 sm:text-xl">
          {count}
        </span>
      </button>

      {open ? (
        <div
          id="active-drivers-menu"
          role="menu"
          aria-labelledby="active-drivers-trigger"
          className="absolute right-0 top-full z-50 mt-1.5 max-h-[min(380px,56vh)] min-w-[min(300px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] shadow-xl shadow-black/10 ring-1 ring-black/[0.06] backdrop-blur-md dark:bg-[var(--surface-2)] dark:shadow-black/40 dark:ring-white/[0.08]"
        >
          <div className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-r from-sky-500/15 via-indigo-500/12 to-violet-500/15 px-3 py-2.5 dark:from-sky-500/20 dark:via-indigo-500/15 dark:to-violet-500/20">
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl"
              aria-hidden
            />
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-800/80 dark:text-sky-200/90">
              On the map
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">
              {listed.length} active
              <span className="font-normal text-[var(--muted)]">
                {" "}
                · tap to focus truck
              </span>
            </p>
          </div>

          <div className="max-h-[min(300px,calc(56vh-5rem))] overflow-y-auto overflow-x-hidden">
            {listed.length === 0 ? (
              <p
                className="px-4 py-8 text-center text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400"
                role="none"
              >
                No drivers on duty — check back after shift change.
              </p>
            ) : (
              <ul className="py-1" role="none">
                {listed.map((d) => {
                  const ring = fleetSummaryRing(d.ringStatus);
                  const eq = EQUIPMENT_MENU[d.equipment];
                  return (
                    <li key={d.id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onPickDriver(d.id);
                          setOpen(false);
                        }}
                        className="group flex w-full gap-2.5 border-b border-[var(--border)]/60 px-2.5 py-2.5 text-left outline-none last:border-b-0 transition-[background,box-shadow] hover:bg-sky-500/[0.07] focus-visible:bg-sky-500/10 dark:hover:bg-white/[0.05] dark:focus-visible:bg-white/[0.07]"
                      >
                        <span
                          className={clsx(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold tabular-nums tracking-tight",
                            RING_AVATAR[ring],
                          )}
                          aria-hidden
                        >
                          {d.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5 gap-y-1">
                            <span className="truncate text-[13px] font-semibold text-[var(--foreground)]">
                              {d.name}
                            </span>
                            <span
                              className={clsx(
                                "inline-flex shrink-0 rounded-md px-1.5 py-px text-[9px] font-bold capitalize tracking-wide",
                                RING_STATUS_CHIP[ring],
                              )}
                            >
                              {ring}
                            </span>
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex rounded-md bg-[var(--surface-1)] px-1.5 py-px font-mono text-[10px] font-medium text-zinc-700 ring-1 ring-black/[0.06] dark:bg-zinc-900/80 dark:text-zinc-300 dark:ring-white/10">
                              {d.truckLabel}
                            </span>
                            <span
                              className={clsx(
                                "inline-flex rounded-md px-1.5 py-px text-[9px] font-semibold",
                                eq.chip,
                              )}
                            >
                              {eq.label}
                            </span>
                            <span
                              className={clsx(
                                "inline-flex items-baseline gap-0.5 text-[10px] tabular-nums",
                                hosAccent(d.hosRemainingHours),
                              )}
                              title="Drive time remaining (HOS)"
                            >
                              <span className="font-medium">{d.hosRemainingHours}h</span>
                              <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-500">
                                HOS
                              </span>
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[10px] text-zinc-500 dark:text-zinc-400">
                            {DRIVER_RING_LABEL[d.ringStatus]}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg
      className={clsx(className, open && "rotate-180")}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
