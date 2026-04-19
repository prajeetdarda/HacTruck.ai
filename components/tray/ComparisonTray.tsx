"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useHover } from "@/components/providers/HoverProvider";
import {
  useMatchLoad,
  type MatchLoadResult,
} from "@/components/providers/MatchLoadProvider";
import { formatCpm } from "@/lib/format";
import { Z_TRAY } from "@/lib/layout-tokens";
import { shortAiReason } from "@/lib/scoring";
import type { Load, RankedDriver } from "@/lib/types";

export function ComparisonTray() {
  const { selectedLoad } = useDispatchContext();
  const match = useMatchLoad();

  const trayReady =
    selectedLoad != null &&
    match.status === "ready" &&
    match.loadId === selectedLoad.id;

  return (
    <div
      className="pointer-events-none absolute inset-x-4 flex justify-center"
      style={{
        zIndex: Z_TRAY,
        /* Sit near the bottom of the map column (timeline is the row below). */
        bottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <AnimatePresence mode="wait">
        {trayReady && selectedLoad ? (
          <ComparisonTrayForLoad
            key={selectedLoad.id}
            selectedLoad={selectedLoad}
            result={match.result}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ComparisonTrayForLoad({
  selectedLoad,
  result,
}: {
  selectedLoad: Load;
  result: MatchLoadResult;
}) {
  const { ranked, assign, driversBase } = useDispatchContext();
  const { hoveredDriverId, setHoveredDriverId } = useHover();
  const [open, setOpen] = useState(false);

  const rankedById = useMemo(() => {
    const m = new Map<string, RankedDriver>();
    for (const r of ranked) m.set(r.driver.id, r);
    return m;
  }, [ranked]);

  const displayRows = useMemo(() => {
    const fromLlm = result.top3?.length ? result.top3.slice(0, 3) : null;

    if (fromLlm?.length) {
      return fromLlm
        .map((row, i) => {
          const rank = i + 1;
          const rankedRow = rankedById.get(row.driverId);
          const driver =
            rankedRow?.driver ??
            driversBase.find((d) => d.id === row.driverId);
          if (!driver) return null;
          return {
            rank,
            driver,
            rankedRow,
            reasoning: row.reasoning,
          };
        })
        .filter(Boolean) as {
        rank: number;
        driver: (typeof driversBase)[number];
        rankedRow: RankedDriver | undefined;
        reasoning: string;
      }[];
    }

    return ranked.slice(0, 3).map((r, i) => ({
      rank: i + 1,
      driver: r.driver,
      rankedRow: r,
      reasoning: shortAiReason(r, i + 1),
    }));
  }, [result, rankedById, ranked, driversBase]);

  const subtitle = (() => {
    if (result.source === "llm")
      return "Ranked by LLM (fleet, trips, vehicles, alerts)";
    if (result.error)
      return `Heuristic fallback — ${result.error}`;
    return "Heuristic rank — add OPENAI_API_KEY for LLM reasoning";
  })();

  /** Best value per metric across cards that have stats (lower is better for miles & CPM). */
  const bestMetrics = useMemo(() => {
    const samples = displayRows
      .map((row) => {
        if (!row.rankedRow) return null;
        return {
          miles: row.rankedRow.features.distanceToPickupMiles,
          hos: row.driver.hosRemainingHours,
          lane: row.driver.laneHistoryCount,
          cpm: row.driver.costPerMile,
        };
      })
      .filter(Boolean) as {
      miles: number;
      hos: number;
      lane: number;
      cpm: number;
    }[];
    if (samples.length < 2) return null;
    return {
      miles: Math.min(...samples.map((s) => s.miles)),
      hos: Math.max(...samples.map((s) => s.hos)),
      lane: Math.max(...samples.map((s) => s.lane)),
      cpm: Math.min(...samples.map((s) => s.cpm)),
    };
  }, [displayRows]);

  const metricValueClass = (isBest: boolean) =>
    clsx(
      "tabular-nums",
      isBest
        ? "font-semibold text-emerald-600 dark:text-emerald-400"
        : "text-zinc-800 dark:text-zinc-300",
    );

  return (
    <motion.div
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
          <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500 dark:text-zinc-500">
            {subtitle}
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
                {displayRows.map((row) => {
                  const r = row.rankedRow;
                  const isHover = hoveredDriverId === row.driver.id;
                  const matchPct =
                    r?.matchPercent ??
                    Math.min(99, 50 + row.driver.laneFamiliarity * 0.35);
                  return (
                    <motion.button
                      type="button"
                      key={row.driver.id}
                      layout
                      onMouseEnter={() => setHoveredDriverId(row.driver.id)}
                      onMouseLeave={() => setHoveredDriverId(null)}
                      onClick={() =>
                        assign(selectedLoad.id, row.driver.id, row.driver.name, {
                          matchPercent: matchPct,
                        })
                      }
                      className={clsx(
                        "rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                        row.rank === 1 &&
                          "border-sky-500/45 bg-sky-500/[0.08] shadow-[0_0_24px_rgba(56,189,248,0.1)]",
                        row.rank !== 1 &&
                          "border-[var(--border)] bg-[var(--surface-1)]/90",
                        isHover && "border-sky-400/70 bg-sky-500/10",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={clsx(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            row.rank === 1
                              ? "bg-sky-500 text-white"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
                          )}
                        >
                          #{row.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[var(--foreground)]">
                            {row.driver.name}
                          </p>
                          <p className="text-[11px] tabular-nums text-emerald-400/90">
                            {Math.round(matchPct)}% match
                          </p>
                        </div>
                      </div>
                      {r ? (
                        <dl className="mt-2 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-500">
                          <div className="flex justify-between gap-2">
                            <dt>Miles to pickup</dt>
                            <dd
                              className={metricValueClass(
                                bestMetrics != null &&
                                  Math.abs(
                                    r.features.distanceToPickupMiles -
                                      bestMetrics.miles,
                                  ) < 1e-6,
                              )}
                            >
                              {Math.round(r.features.distanceToPickupMiles)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt>HOS left</dt>
                            <dd
                              className={metricValueClass(
                                bestMetrics != null &&
                                  Math.abs(
                                    row.driver.hosRemainingHours -
                                      bestMetrics.hos,
                                  ) < 1e-6,
                              )}
                            >
                              {row.driver.hosRemainingHours.toFixed(1)}h
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt>Lane history</dt>
                            <dd
                              className={metricValueClass(
                                bestMetrics != null &&
                                  row.driver.laneHistoryCount ===
                                    bestMetrics.lane,
                              )}
                            >
                              {row.driver.laneHistoryCount}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt>CPM</dt>
                            <dd
                              className={metricValueClass(
                                bestMetrics != null &&
                                  Math.abs(
                                    row.driver.costPerMile - bestMetrics.cpm,
                                  ) < 1e-6,
                              )}
                            >
                              {formatCpm(row.driver.costPerMile)}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="mt-2 text-[11px] text-zinc-500">
                          Stats unavailable for this driver in the current
                          ranking set.
                        </p>
                      )}
                      <p className="mt-2 border-t border-black/[0.06] pt-2 text-[11px] leading-snug text-sky-700 dark:border-white/[0.06] dark:text-sky-300/90">
                        {row.reasoning}
                      </p>
                      <span
                        className={clsx(
                          "mt-3 block w-full rounded-lg py-2 text-center text-xs font-semibold transition-colors",
                          row.rank === 1
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
  );
}
