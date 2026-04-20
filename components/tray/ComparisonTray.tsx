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
        bottom: "max(68px, calc(68px + env(safe-area-inset-bottom, 0px)))",
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
  const { ranked, assign, driversBase, selectDriver } = useDispatchContext();
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
          return { rank, driver, rankedRow, reasoning: row.reasoning };
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
    if (result.source === "llm") return "Ranked by dispatch AI — fleet, trips, vehicles, alerts";
    if (result.error) return `Heuristic fallback — ${result.error}`;
    return "Heuristic rank — add OPENAI_API_KEY for AI reasoning";
  })();

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
      .filter(Boolean) as { miles: number; hos: number; lane: number; cpm: number }[];
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
      isBest ? "font-bold text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-300",
    );

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="pointer-events-auto flex w-full max-w-3xl flex-col items-center gap-2"
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass-panel relative flex w-full max-w-2xl items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left outline-none transition-all hover:border-amber-500/25 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        aria-expanded={open}
        aria-controls="comparison-tray-panel"
      >
        {/* Left amber accent strip */}
        <div className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 opacity-80" />
        <span className="min-w-0 flex-1 pl-2">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400/80">
            Top matches
          </span>
          <span className="mt-0.5 block truncate text-sm text-slate-700 dark:text-slate-200">
            {selectedLoad.id} · {selectedLoad.origin} → {selectedLoad.destination}
          </span>
          <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
            {subtitle}
          </span>
        </span>
        <span className="shrink-0 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
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
            className="w-full overflow-hidden"
          >
            <div className="glass-panel max-h-[min(52vh,400px)] overflow-y-auto rounded-2xl p-3 shadow-[0_-12px_48px_rgba(0,0,0,0.65)] sm:p-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {displayRows.map((row) => {
                  const r = row.rankedRow;
                  const isHover = hoveredDriverId === row.driver.id;
                  const matchPct =
                    r?.matchPercent ??
                    Math.min(99, 50 + row.driver.laneFamiliarity * 0.35);
                  return (
                    <motion.div
                      key={row.driver.id}
                      layout
                      role="article"
                      onMouseEnter={() => setHoveredDriverId(row.driver.id)}
                      onMouseLeave={() => setHoveredDriverId(null)}
                      onClick={() => selectDriver(row.driver.id)}
                      className={clsx(
                        "group relative cursor-pointer rounded-xl border p-3 transition-all duration-200",
                        row.rank === 1 &&
                          "border-amber-500/40 bg-amber-500/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.12)]",
                        row.rank !== 1 &&
                          "border-[var(--glass-border)] bg-[var(--surface-1)]/80",
                        isHover && "border-amber-400/50 bg-amber-500/[0.10]",
                      )}
                    >
                      {/* Match % bar across top */}
                      <div className="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.06]">
                        <div
                          className={clsx(
                            "h-full rounded-full",
                            row.rank === 1 ? "bg-amber-400" : "bg-green-500/70",
                          )}
                          style={{ width: `${Math.round(matchPct)}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={clsx(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            row.rank === 1
                              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                              : "bg-[var(--surface-2)] text-slate-400 ring-1 ring-[var(--glass-border)]",
                          )}
                        >
                          #{row.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[var(--foreground)]">
                            {row.driver.name}
                          </p>
                          <p className={clsx("text-[12px] font-bold tabular-nums", row.rank === 1 ? "text-amber-600 dark:text-amber-400" : "text-green-700 dark:text-green-400")}>
                            {Math.round(matchPct)}% match
                          </p>
                        </div>
                      </div>
                      {r ? (
                        <dl className="mt-2.5 space-y-1 text-[11px] text-slate-500">
                          <div className="flex justify-between gap-2">
                            <dt>Miles to pickup</dt>
                            <dd className={metricValueClass(
                              bestMetrics != null &&
                                Math.abs(r.features.distanceToPickupMiles - bestMetrics.miles) < 1e-6,
                            )}>
                              {Math.round(r.features.distanceToPickupMiles)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt>HOS left</dt>
                            <dd className={metricValueClass(
                              bestMetrics != null &&
                                Math.abs(row.driver.hosRemainingHours - bestMetrics.hos) < 1e-6,
                            )}>
                              {row.driver.hosRemainingHours.toFixed(1)}h
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt>Lane history</dt>
                            <dd className={metricValueClass(
                              bestMetrics != null && row.driver.laneHistoryCount === bestMetrics.lane,
                            )}>
                              {row.driver.laneHistoryCount}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt>CPM</dt>
                            <dd className={metricValueClass(
                              bestMetrics != null &&
                                Math.abs(row.driver.costPerMile - bestMetrics.cpm) < 1e-6,
                            )}>
                              {formatCpm(row.driver.costPerMile)}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Stats unavailable for this driver.
                        </p>
                      )}
                      <p className="mt-2.5 border-t border-[var(--glass-border)] pt-2 text-[11px] leading-snug text-amber-700 dark:text-amber-300/70">
                        {row.reasoning}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          assign(selectedLoad.id, row.driver.id, row.driver.name, {
                            matchPercent: matchPct,
                          });
                        }}
                        className={clsx(
                          "mt-3 block w-full rounded-lg py-2 text-center text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                          row.rank === 1
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_14px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.45)]"
                            : "border border-[var(--glass-border)] bg-[var(--surface-2)] text-slate-600 dark:text-slate-300 hover:border-amber-500/30 hover:text-amber-700 dark:hover:text-amber-300",
                        )}
                      >
                        Assign
                      </button>
                    </motion.div>
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
