"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { FLEET_NAME, TERMINAL, listAlerts } from "@/lib/backend-db";
import {
  countDriversByFleetSummaryRing,
  type FleetSummaryRing,
} from "@/lib/types";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useTheme } from "@/components/providers/ThemeProvider";

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

export function TopBar() {
  const {
    openLoads,
    activeDriverCount,
    selectedLoad,
    driversSimulated,
    loadInboxExpanded,
    state,
    setMapRingFilter,
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

  const tripAlertBoardCount = useMemo(() => listAlerts().length, []);

  const showFleetStrip =
    !selectedLoad && !loadInboxExpanded;

  return (
    <header className="flex min-h-[52px] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-1)]/95 px-4 py-2 backdrop-blur-md sm:gap-4 sm:px-5">
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
        <Stat label="Active drivers" value={activeDriverCount} accent="text-sky-400" />
        <Stat label="Open loads" value={openLoads.length} accent="text-amber-400" />
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="pb-0.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className={`text-lg font-semibold tabular-nums leading-none sm:text-xl ${accent}`}>
        {value}
      </div>
    </div>
  );
}
