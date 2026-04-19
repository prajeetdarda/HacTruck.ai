"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { formatEquipment } from "@/lib/format";
import { Z_PANEL } from "@/lib/layout-tokens";
import type { Driver } from "@/lib/types";

const RING_LABEL: Record<Driver["ringStatus"], string> = {
  available: "Available",
  en_route: "En Route",
  constrained: "Tight HOS",
  unavailable: "Out of Service",
  off_duty: "Off Duty",
};

const RING_DOT: Record<Driver["ringStatus"], string> = {
  available: "bg-emerald-400",
  en_route: "bg-sky-400",
  constrained: "bg-amber-400",
  unavailable: "bg-red-400",
  off_duty: "bg-zinc-400 dark:bg-zinc-500",
};

const RING_BADGE: Record<Driver["ringStatus"], string> = {
  available: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10",
  en_route: "text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10",
  constrained: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10",
  unavailable: "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-500/10",
  off_duty: "text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800",
};

export function DriverListPanel() {
  const { state, driversSimulated, selectDriver, setMapRingFilter } =
    useDispatchContext();

  const visible =
    state.mapRingFilter != null && state.selectedDriverId == null;

  const filteredDrivers = useMemo(() => {
    if (!state.mapRingFilter) return [];
    return driversSimulated
      .filter((d) => d.ringStatus === state.mapRingFilter)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [driversSimulated, state.mapRingFilter]);

  return (
    <AnimatePresence>
      {visible && state.mapRingFilter && (
        <motion.aside
          key={state.mapRingFilter}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="absolute inset-y-0 right-0 flex w-[min(360px,100%)] flex-col border-l border-[var(--border)] bg-[var(--surface-2)]/98 shadow-[-16px_0_48px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[-16px_0_48px_rgba(0,0,0,0.4)]"
          style={{ zIndex: Z_PANEL }}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${RING_DOT[state.mapRingFilter]}`}
              />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Live Fleet
                </p>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  {RING_LABEL[state.mapRingFilter]}
                  <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                    {filteredDrivers.length} driver
                    {filteredDrivers.length !== 1 ? "s" : ""}
                  </span>
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMapRingFilter(state.mapRingFilter!)}
              className="rounded-lg p-2 text-zinc-600 outline-none transition-colors hover:bg-black/[0.04] hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
              aria-label="Clear filter"
            >
              ✕
            </button>
          </div>

          <ul className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
            {filteredDrivers.map((driver) => {
              const hosPct = Math.min(
                100,
                (driver.hosRemainingHours / driver.hosMaxHours) * 100,
              );
              return (
                <li key={driver.id}>
                  <button
                    type="button"
                    onClick={() => selectDriver(driver.id)}
                    className="w-full px-5 py-3.5 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                          {driver.initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {driver.name}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {driver.truckLabel}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${RING_BADGE[driver.ringStatus]}`}
                      >
                        {RING_LABEL[driver.ringStatus]}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
                      <div>
                        <span className="block font-medium">HOS</span>
                        <span className="tabular-nums text-[var(--foreground)]">
                          {driver.hosRemainingHours.toFixed(1)}h
                        </span>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all"
                            style={{ width: `${hosPct}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <span className="block font-medium">Equipment</span>
                        <span className="text-[var(--foreground)]">
                          {formatEquipment(driver.equipment)}
                        </span>
                      </div>
                      <div>
                        <span className="block font-medium">Lane</span>
                        <span className="text-[var(--foreground)]">
                          {driver.laneFamiliarity}%
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
