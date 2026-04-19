"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useHover } from "@/components/providers/HoverProvider";
import { formatCpm } from "@/lib/format";
import { Z_TRAY } from "@/lib/layout-tokens";
import { shortAiReason } from "@/lib/scoring";

export function ComparisonTray() {
  const { selectedLoad, ranked, assign } = useDispatchContext();
  const { hoveredDriverId, setHoveredDriverId } = useHover();
  const [open, setOpen] = useState(false);

  const top3 = ranked.slice(0, 3);

  return (
    <div
      className="pointer-events-none absolute inset-x-4 flex justify-center"
      style={{
        zIndex: Z_TRAY,
        bottom: "calc(var(--timeline-region-height) + 0.2rem)",
      }}
    >
      <AnimatePresence mode="wait">
        {selectedLoad && (
          <motion.div
            key={selectedLoad.id}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-2"
          >
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex w-full max-w-sm items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/95 px-3 py-2.5 text-left shadow-lg shadow-black/10 outline-none transition-colors hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] backdrop-blur-md dark:shadow-black/30"
              aria-expanded={open}
              aria-controls="comparison-tray-panel"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Top matches
                </span>
                <span className="mt-0.5 block truncate text-sm text-zinc-800 dark:text-zinc-300">
                  {selectedLoad.id} · {selectedLoad.origin} →{" "}
                  {selectedLoad.destination}
                </span>
              </span>
              <span className="shrink-0 rounded-lg bg-zinc-200/90 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800/90 dark:text-zinc-300">
                {open ? "Hide" : "Show"}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id="comparison-tray-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="w-full max-w-2xl overflow-hidden"
                >
                  <div className="max-h-[min(52vh,380px)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/95 p-3 shadow-[0_-12px_48px_rgba(0,0,0,0.12)] backdrop-blur-md sm:p-4 dark:shadow-[0_-12px_48px_rgba(0,0,0,0.45)]">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                      {top3.map((r, i) => {
                        const rank = i + 1;
                        const isHover = hoveredDriverId === r.driver.id;
                        return (
                          <motion.button
                            type="button"
                            key={r.driver.id}
                            layout
                            onMouseEnter={() =>
                              setHoveredDriverId(r.driver.id)
                            }
                            onMouseLeave={() => setHoveredDriverId(null)}
                            onClick={() =>
                              selectedLoad &&
                              assign(
                                selectedLoad.id,
                                r.driver.id,
                                r.driver.name,
                              )
                            }
                            className={clsx(
                              "rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                              rank === 1 &&
                                "border-sky-500/45 bg-sky-500/[0.08] shadow-[0_0_24px_rgba(56,189,248,0.1)]",
                              rank !== 1 &&
                                "border-[var(--border)] bg-[var(--surface-1)]/90",
                              isHover && "border-sky-400/70 bg-sky-500/10",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={clsx(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                  rank === 1
                                    ? "bg-sky-500 text-white"
                                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
                                )}
                              >
                                #{rank}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-[var(--foreground)]">
                                  {r.driver.name}
                                </p>
                                <p className="text-[11px] tabular-nums text-emerald-400/90">
                                  {r.matchPercent}% match
                                </p>
                              </div>
                            </div>
                            <dl className="mt-2 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-500">
                              <div className="flex justify-between gap-2">
                                <dt>Miles to pickup</dt>
                                <dd className="tabular-nums text-zinc-800 dark:text-zinc-300">
                                  {Math.round(
                                    r.features.distanceToPickupMiles,
                                  )}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>HOS left</dt>
                                <dd className="tabular-nums text-zinc-800 dark:text-zinc-300">
                                  {r.driver.hosRemainingHours.toFixed(1)}h
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Lane history</dt>
                                <dd className="tabular-nums text-zinc-800 dark:text-zinc-300">
                                  {r.driver.laneHistoryCount}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>CPM</dt>
                                <dd className="tabular-nums text-zinc-800 dark:text-zinc-300">
                                  {formatCpm(r.driver.costPerMile)}
                                </dd>
                              </div>
                            </dl>
                            <p className="mt-2 border-t border-black/[0.06] pt-2 text-[11px] leading-snug text-sky-700 dark:border-white/[0.06] dark:text-sky-300/90">
                              {shortAiReason(r, rank)}
                            </p>
                            <span
                              className={clsx(
                                "mt-3 block w-full rounded-lg py-2 text-center text-xs font-semibold transition-colors",
                                rank === 1
                                  ? "bg-sky-500 text-white hover:bg-sky-400"
                                  : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
                              )}
                            >
                              Assign
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
