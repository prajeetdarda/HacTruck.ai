"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { FLEET_NAME } from "@/lib/mock-data";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { Driver } from "@/lib/types";

type Ring = Driver["ringStatus"];

const RING_ROWS: {
  key: Ring;
  label: string;
  dot: string;
  text: string;
}[] = [
  {
    key: "available",
    label: "avail",
    dot: "bg-emerald-400",
    text: "text-emerald-800 dark:text-emerald-300",
  },
  {
    key: "en_route",
    label: "en route",
    dot: "bg-sky-400",
    text: "text-sky-800 dark:text-sky-300",
  },
  {
    key: "constrained",
    label: "tight HOS",
    dot: "bg-amber-400",
    text: "text-amber-900 dark:text-amber-300",
  },
  {
    key: "unavailable",
    label: "out",
    dot: "bg-red-400",
    text: "text-red-800 dark:text-red-300",
  },
  {
    key: "off_duty",
    label: "off duty",
    dot: "bg-zinc-400 dark:bg-zinc-500",
    text: "text-zinc-700 dark:text-zinc-400",
  },
];

export function TopBar() {
  const {
    openLoads,
    activeDriverCount,
    driversSimulated,
    selectedLoad,
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

  const ringCounts = useMemo(() => {
    const c: Record<Ring, number> = {
      available: 0,
      constrained: 0,
      unavailable: 0,
      en_route: 0,
      off_duty: 0,
    };
    for (const d of driversSimulated) {
      c[d.ringStatus]++;
    }
    return c;
  }, [driversSimulated]);

  const timeStr =
    now == null
      ? "--:--:-- --"
      : now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

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

      {!selectedLoad && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-1 overflow-x-auto">
          <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-500 md:inline">
            Live fleet
          </span>
          {RING_ROWS.map(({ key, label, dot, text }) => {
            const n = ringCounts[key];
            if (n === 0) return null;
            const active = state.mapRingFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMapRingFilter(key)}
                aria-pressed={active}
                title={
                  active
                    ? `Showing ${label} — click again to show all trucks`
                    : `Browse ${label}: open first truck, map arrows for others`
                }
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] ${
                  active
                    ? "border-sky-500/60 bg-sky-500/15 ring-1 ring-sky-500/30"
                    : "border-black/10 bg-black/[0.04] hover:border-black/18 hover:bg-black/[0.08] dark:border-white/[0.08] dark:bg-black/20 dark:hover:border-white/[0.14] dark:hover:bg-black/30"
                } ${text}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                {n} {label}
              </button>
            );
          })}
        </div>
      )}

      {selectedLoad && <div className="min-w-0 flex-1" aria-hidden />}

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
