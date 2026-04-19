"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { formatCpm, formatEquipment, formatRejectTag } from "@/lib/format";
import { Z_PANEL } from "@/lib/layout-tokens";

export function DriverDetailPanel() {
  const {
    state,
    selectedLoad,
    driversSimulated,
    selectDriver,
    assign,
    assignBestForSelectedLoad,
    ranked,
  } = useDispatchContext();

  const driver = useMemo(
    () => driversSimulated.find((d) => d.id === state.selectedDriverId),
    [driversSimulated, state.selectedDriverId],
  );

  const rankedRow = useMemo(
    () => ranked.find((r) => r.driver.id === driver?.id),
    [ranked, driver?.id],
  );

  const hosPct = driver
    ? Math.min(100, (driver.hosRemainingHours / driver.hosMaxHours) * 100)
    : 0;

  return (
    <AnimatePresence mode="wait">
      {state.selectedDriverId && driver && (
        <motion.aside
          key={driver.id}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="absolute inset-y-0 right-0 flex w-[min(380px,100%)] flex-col border-l border-[var(--border)] bg-[var(--surface-2)]/98 shadow-[-16px_0_48px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[-16px_0_48px_rgba(0,0,0,0.4)]"
          style={{ zIndex: Z_PANEL }}
        >
          <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Driver
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {driver.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">
                {driver.truckLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectDriver(null)}
              className="rounded-lg p-2 text-zinc-600 outline-none transition-colors hover:bg-black/[0.04] hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Status
              </h3>
              <p className="mt-1 capitalize text-zinc-800 dark:text-zinc-300">
                {driver.ringStatus.replace("_", " ")}
              </p>
              {driver.currentLoadEndingInHours != null && (
                <p className="mt-1 text-sm text-sky-400/90">
                  ETA to clear current: ~{driver.currentLoadEndingInHours.toFixed(1)}h
                </p>
              )}
            </section>

            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                HOS snapshot
              </h3>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${hosPct}%` }}
                />
              </div>
              <p className="mt-1 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                {driver.hosRemainingHours.toFixed(1)}h / {driver.hosMaxHours}h cycle
              </p>
            </section>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase text-[var(--muted)]">
                  Equipment
                </dt>
                <dd className="text-zinc-800 dark:text-zinc-300">
                  {formatEquipment(driver.equipment)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-[var(--muted)]">
                  Lane familiarity
                </dt>
                <dd className="text-zinc-800 dark:text-zinc-300">
                  {driver.laneFamiliarity}%
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-[var(--muted)]">
                  Cost / mi
                </dt>
                <dd className="tabular-nums text-zinc-800 dark:text-zinc-300">
                  {formatCpm(driver.costPerMile)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-[var(--muted)]">
                  Confidence
                </dt>
                <dd className="text-zinc-800 dark:text-zinc-300">
                  {rankedRow
                    ? `${Math.min(99, rankedRow.matchPercent + 2)}%`
                    : "—"}
                </dd>
              </div>
            </dl>

            {rankedRow && rankedRow.rejectTags.length > 0 && (
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Compliance / fit flags
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rankedRow.rejectTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-900 dark:text-amber-300"
                    >
                      {formatRejectTag(tag)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {rankedRow && (
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Why this rank
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {rankedRow.reasons.map((x, i) => (
                    <li key={`${i}-${x}`}>{x}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="space-y-2 border-t border-[var(--border)] p-5">
            <button
              type="button"
              disabled={!selectedLoad}
              onClick={() =>
                selectedLoad &&
                assign(selectedLoad.id, driver.id, driver.name)
              }
              className="w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {selectedLoad
                ? `Assign to ${selectedLoad.id}`
                : "Select a load first"}
            </button>
            <button
              type="button"
              disabled={!selectedLoad}
              onClick={() => assignBestForSelectedLoad()}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-2.5 text-xs font-semibold text-zinc-800 transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              Assign best fit for this load
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
