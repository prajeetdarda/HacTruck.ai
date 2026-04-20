"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FLEET_NAME, TERMINAL, listAlerts } from "@/lib/backend-db";
import {
  countDriversByFleetSummaryRing,
  fleetSummaryRing,
  type Driver,
  type FleetSummaryRing,
} from "@/lib/types";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Z_MAP } from "@/lib/layout-tokens";

const RING_ORDER: FleetSummaryRing[] = ["urgent", "watch", "good", "inactive"];

const RING_CLASS: Record<FleetSummaryRing, string> = {
  urgent: "text-rose-600 dark:text-rose-400",
  watch: "text-amber-600 dark:text-amber-400",
  good: "text-green-700 dark:text-green-400",
  inactive: "text-slate-500",
};


/** Ring → solid tile gradient */
const RING_TILE_STYLE: Record<FleetSummaryRing, { avatar: string; tile: string; bar: string; glow: string }> = {
  urgent: {
    avatar: "background: linear-gradient(135deg,#f43f5e,#be123c)",
    tile: "border-rose-500/30 bg-rose-500/[0.07]",
    bar: "#f43f5e",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.3)]",
  },
  watch: {
    avatar: "background: linear-gradient(135deg,#f59e0b,#b45309)",
    tile: "border-amber-500/30 bg-amber-500/[0.07]",
    bar: "#f59e0b",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.25)]",
  },
  good: {
    avatar: "background: linear-gradient(135deg,#22c55e,#15803d)",
    tile: "border-green-500/25 bg-green-500/[0.05]",
    bar: "#22c55e",
    glow: "",
  },
  inactive: {
    avatar: "background: linear-gradient(135deg,#64748b,#334155)",
    tile: "border-slate-500/20 bg-slate-500/[0.04]",
    bar: "#64748b",
    glow: "",
  },
};

function hosBarColor(hours: number): string {
  if (hours <= 2) return "#f43f5e";
  if (hours <= 5) return "#f59e0b";
  return "#22c55e";
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
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

  const showFleetStrip = !selectedLoad && !loadInboxExpanded;

  return (
    <header
      className="absolute inset-x-0 top-0 glass-panel flex min-h-[48px] shrink-0 items-center gap-3 px-4 py-2 sm:gap-4 sm:px-5"
      style={{ zIndex: Z_MAP + 10 }}
    >
      {/* Bottom edge amber glow accent */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.3) 25%, rgba(245,158,11,0.5) 50%, rgba(245,158,11,0.3) 75%, transparent 100%)",
        }}
        aria-hidden
      />

      {/* Brand */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/55 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]" />
          </span>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400/70 sm:inline motion-safe:animate-[live-label_2.8s_ease-in-out_infinite]">
            Live ops
          </span>
        </motion.div>
        <div className="hidden h-5 w-px shrink-0 bg-[var(--glass-border)] sm:block" />
        <div className="min-w-0">
          <h1 className="max-w-[140px] truncate text-sm font-bold tracking-tight text-[var(--foreground)] sm:max-w-none sm:text-base">
            {FLEET_NAME}
          </h1>
          <p
            className="mt-0.5 hidden max-w-[min(280px,40vw)] truncate text-[10px] text-slate-500 sm:block"
            title={TERMINAL.name}
          >
            {TERMINAL.name}
          </p>
        </div>
      </div>

      {/* Fleet status strip */}
      {showFleetStrip ? (
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-2">
          <div
            className="hidden max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center text-[11px] leading-snug sm:flex"
            aria-live="polite"
            role="toolbar"
            aria-label="Fleet status by ring"
          >
            <span className="mr-1.5 hidden shrink-0 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600 lg:inline">
              Live fleet status
            </span>
            {RING_ORDER.map((ring) => (
              <span
                key={ring}
                className="inline-flex shrink-0 items-center gap-x-1 text-slate-600"
              >
                <span aria-hidden className="select-none">●</span>
                <button
                  type="button"
                  disabled={ringCounts[ring] === 0}
                  onClick={() => setMapRingFilter(ring)}
                  title={
                    state.mapRingFilter === ring
                      ? `Clear ${ring} focus`
                      : `${ringCounts[ring]} truck${ringCounts[ring] === 1 ? "" : "s"} in ${ring}`
                  }
                  className={clsx(
                    "rounded-md px-1.5 py-0.5 tabular-nums outline-none transition-all",
                    "hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                    "disabled:pointer-events-none disabled:opacity-35",
                    RING_CLASS[ring],
                    state.mapRingFilter === ring &&
                      "bg-white/[0.08] ring-1 ring-current/25",
                  )}
                >
                  {ringCounts[ring]} {ring}
                </button>
              </span>
            ))}
            {tripAlertBoardCount > 0 ? (
              <span className="relative ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
                </span>
                {tripAlertBoardCount} alert{tripAlertBoardCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}

      {/* Right side KPIs + controls */}
      <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
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
          <div className="text-lg font-bold tabular-nums leading-none text-amber-600 dark:text-amber-400 sm:text-xl">
            {openLoads.length}
          </div>
        </button>
        <div className="hidden pb-0.5 text-right sm:block">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Local time
          </div>
          <div className="font-mono text-sm tabular-nums leading-none text-slate-600 dark:text-slate-300/80">
            {timeStr}
          </div>
        </div>
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light map" : "Switch to dark map"}
          title={theme === "dark" ? "Light map mode" : "Dark map mode"}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--surface-2)] text-slate-500 outline-none transition-colors hover:border-amber-500/40 hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        >
          {theme === "dark" ? (
            <SunIcon className="size-4" />
          ) : (
            <MoonIcon className="size-4" />
          )}
        </button>
      </div>
    </header>
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

  /** Sort: urgent → watch → good → inactive, then by name */
  const RING_PRIORITY: Record<FleetSummaryRing, number> = { urgent: 0, watch: 1, good: 2, inactive: 3 };

  const listed = useMemo(() => {
    return [...drivers].filter(isActiveDriver).sort((a, b) => {
      const ra = fleetSummaryRing(a.ringStatus);
      const rb = fleetSummaryRing(b.ringStatus);
      const pd = RING_PRIORITY[ra] - RING_PRIORITY[rb];
      if (pd !== 0) return pd;
      return a.name.localeCompare(b.name);
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
      {/* Trigger */}
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
        <span className="text-lg font-bold tabular-nums leading-none text-amber-600 dark:text-amber-400 sm:text-xl">
          {count}
        </span>
      </button>

      {/* Fleet grid dropdown */}
      {open && (
        <div
          id="active-drivers-menu"
          role="menu"
          aria-labelledby="active-drivers-trigger"
          className="glass-panel absolute right-0 top-full z-50 mt-1.5 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl"
        >
          {/* Header strip */}
          <div className="flex items-center justify-between border-b border-[var(--glass-border)] bg-gradient-to-r from-amber-500/[0.08] to-transparent px-3 py-2.5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400/80">
                Fleet board
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-[var(--foreground)]">
                {listed.length} on duty
                <span className="ml-1.5 font-normal text-[var(--muted)]">· tap to focus</span>
              </p>
            </div>
            {/* Ring summary pills */}
            <div className="flex items-center gap-1">
              {(["urgent","watch","good"] as FleetSummaryRing[]).map((ring) => {
                const n = listed.filter((d) => fleetSummaryRing(d.ringStatus) === ring).length;
                if (n === 0) return null;
                return (
                  <span
                    key={ring}
                    className={clsx(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[9px] font-bold tabular-nums",
                      ring === "urgent" && "bg-rose-500/20 text-rose-700 dark:text-rose-300",
                      ring === "watch" && "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                      ring === "good" && "bg-green-500/15 text-green-700 dark:text-green-400",
                    )}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 3-col driver grid */}
          {listed.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12px] text-[var(--muted)]" role="none">
              No drivers on duty.
            </p>
          ) : (
            <div
              className="grid gap-1.5 overflow-y-auto p-2.5"
              style={{ gridTemplateColumns: "repeat(3, 1fr)", maxHeight: "min(360px, 54vh)" }}
              role="none"
            >
              {listed.map((d) => {
                const ring = fleetSummaryRing(d.ringStatus);
                const tile = RING_TILE_STYLE[ring];
                const hosPct = d.hosMaxHours > 0
                  ? Math.min(100, (d.hosRemainingHours / d.hosMaxHours) * 100)
                  : 0;
                const barColor = hosBarColor(d.hosRemainingHours);
                const firstName = d.name.split(" ")[0] ?? d.name;

                return (
                  <button
                    key={d.id}
                    type="button"
                    role="menuitem"
                    onClick={() => { onPickDriver(d.id); setOpen(false); }}
                    className={clsx(
                      "group flex flex-col items-center gap-2 rounded-xl border p-2.5 text-center outline-none transition-all duration-150",
                      "hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                      tile.tile,
                      tile.glow,
                    )}
                  >
                    {/* Avatar */}
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold text-white shadow-md"
                      style={{ background: tile.avatar.replace("background: ", "") }}
                      aria-hidden
                    >
                      {d.initials}
                    </span>

                    {/* Name */}
                    <span className="w-full truncate text-[10px] font-semibold leading-none text-[var(--foreground)]">
                      {firstName}
                    </span>

                    {/* HOS bar */}
                    <div className="w-full space-y-0.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${hosPct}%`, background: barColor }}
                        />
                      </div>
                      <span
                        className="block text-[9px] tabular-nums"
                        style={{ color: barColor }}
                      >
                        {d.hosRemainingHours.toFixed(1)}h
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
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
