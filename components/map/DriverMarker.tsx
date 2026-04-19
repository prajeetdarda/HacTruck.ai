"use client";

import clsx from "clsx";
import {
  RING_STATUS_COLOR,
  RingStatusNotificationBadge,
  TruckMarkerIcon,
} from "@/components/icons/MapMarkers";
import type { Driver, RankedDriver } from "@/lib/types";

type Props = {
  driver: Driver;
  dimmed: boolean;
  isCandidate: boolean;
  isHovered: boolean;
  /** When a load + another driver are focused, de-emphasize this marker. */
  fadedBySelection?: boolean;
  ranked?: RankedDriver;
  dragging: boolean;
  /** 1-based rank among assignable drivers for this load; only when a load is selected. */
  rankForLoad?: number | null;
  /** Load selected: neutral truck chrome (no ring status color/badge), rank badge layout. */
  loadPickMode?: boolean;
};

export function DriverMarkerContent({
  driver,
  dimmed,
  isCandidate,
  isHovered,
  fadedBySelection = false,
  ranked,
  dragging,
  rankForLoad,
  loadPickMode = false,
}: Props) {
  let opacity =
    dimmed && !isHovered
      ? 0.22
      : isCandidate || isHovered
        ? 1
        : dimmed
          ? 0.35
          : 1;
  if (fadedBySelection && !isHovered) {
    opacity *= 0.22;
  }

  const badge =
    ranked && ranked.rejectTags.length > 0
      ? ranked.rejectTags[0]!.replace(/_/g, " ")
      : null;

  return (
    <div
      className={clsx(
        "pointer-events-auto flex min-h-[40px] min-w-[40px] flex-col items-center justify-center select-none",
        dragging && "cursor-grabbing",
        !dragging && "cursor-pointer",
      )}
    >
      <div
        className="relative flex flex-col items-center transition-opacity duration-200"
        style={{ opacity }}
      >
        {badge && (
          <span className="absolute -top-4 max-w-[100px] truncate text-center text-[7px] font-semibold uppercase tracking-wide text-amber-400">
            {badge}
          </span>
        )}
        <div
          className={clsx(
            "relative flex h-11 w-11 shrink-0 items-center justify-center",
            isCandidate &&
              (loadPickMode
                ? "drop-shadow-[0_0_10px_rgba(56,189,248,0.42)]"
                : "drop-shadow-[0_0_12px_rgba(248,113,113,0.55)]"),
          )}
        >
          <div
            className={clsx(
              "relative box-border flex h-10 w-10 items-center justify-center overflow-visible rounded-xl border-2 border-solid bg-gradient-to-b from-zinc-100 to-zinc-200 shadow-[0_4px_14px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] dark:from-zinc-800 dark:to-zinc-950 dark:shadow-[0_6px_18px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
              isCandidate &&
                (loadPickMode
                  ? "ring-2 ring-sky-500/65 ring-offset-2 ring-offset-[var(--surface-0)] dark:ring-sky-400/55"
                  : "ring-2 ring-red-400/70 ring-offset-2 ring-offset-[var(--surface-0)] dark:ring-red-500/50"),
              loadPickMode && "border-slate-400 dark:border-slate-500",
            )}
            style={
              loadPickMode
                ? undefined
                : { borderColor: RING_STATUS_COLOR[driver.ringStatus] }
            }
          >
            {rankForLoad != null && rankForLoad > 0 && (
              <span
                className={clsx(
                  "pointer-events-none absolute -left-1 -top-1 z-[3] flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-white px-[3px] text-[8px] font-extrabold leading-none text-white shadow-sm tabular-nums dark:border-zinc-900",
                  rankForLoad <= 3
                    ? "bg-emerald-600 dark:bg-emerald-500"
                    : "bg-sky-600 dark:bg-sky-500",
                )}
                aria-hidden
              >
                {rankForLoad}
              </span>
            )}
            <TruckMarkerIcon
              className="h-9 w-9 shrink-0 drop-shadow-sm"
              ringStatus={driver.ringStatus}
              statusStrokeOverride={
                loadPickMode ? "#94a3b8" : undefined
              }
            />
            {!loadPickMode && (
              <RingStatusNotificationBadge status={driver.ringStatus} />
            )}
            <span className="pointer-events-none absolute bottom-0.5 left-0.5 inline-flex items-baseline gap-0 rounded bg-black/18 px-[2px] text-[6px] font-bold leading-none text-white tabular-nums shadow-sm dark:bg-black/55">
              {driver.initials}
            </span>
          </div>
        </div>
        <span className="mt-0.5 max-w-[88px] truncate text-center text-[8px] font-medium text-zinc-600 dark:text-zinc-400">
          {driver.name.split(" ")[0]}
        </span>
      </div>
    </div>
  );
}
