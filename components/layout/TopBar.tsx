"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { FLEET_NAME } from "@/lib/mock-data";
import type { DriverRingStatus } from "@/lib/types";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useTheme } from "@/components/providers/ThemeProvider";

const RING_ORDER: DriverRingStatus[] = [
  "urgent",
  "watch",
  "good",
  "inactive",
];

const RING_CLASS: Record<DriverRingStatus, string> = {
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

  const ringCounts = useMemo(() => {
    const n: Record<DriverRingStatus, number> = {
      urgent: 0,
      watch: 0,
      good: 0,
      inactive: 0,
    };
    for (const d of driversSimulated) {
      n[d.ringStatus] += 1;
    }
    return n;
  }, [driversSimulated]);

  const showFleetStrip =
    !selectedLoad && !loadInboxExpanded;

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-1)]/95 px-4 backdrop-blur-md sm:gap-4 sm:px-5">
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
        <h1 className="max-w-[140px] truncate text-sm font-semibold tracking-tight text-[var(--foreground)] sm:max-w-none sm:text-base">
          {FLEET_NAME}
        </h1>
      </div>

      {showFleetStrip ? (
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-2">
          <div
            className="hidden max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center text-[11px] leading-snug sm:flex"
            aria-live="polite"
            role="toolbar"
            aria-label="Fleet status — tap a category to focus those trucks on the map"
          >
            <span className="shrink-0 font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-400">
              Fleet alerts
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
                      : `Show ${ring} trucks on the map`
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
