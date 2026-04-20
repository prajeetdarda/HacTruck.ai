"use client";

import clsx from "clsx";
import {
  RingStatusNotificationBadge,
  TruckMarkerIcon,
} from "@/components/icons/MapMarkers";
import type { Driver, RankedDriver } from "@/lib/types";

type Props = {
  driver: Driver;
  dimmed: boolean;
  isCandidate: boolean;
  isHovered: boolean;
  fadedBySelection?: boolean;
  ranked?: RankedDriver;
  dragging: boolean;
  rankForLoad?: number | null;
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
      ? 0.32
      : isCandidate || isHovered
        ? 1
        : dimmed
          ? 0.45
          : 1;
  if (fadedBySelection && !isHovered) {
    opacity *= 0.38;
  }

  const badge =
    ranked && ranked.rejectTags.length > 0
      ? ranked.rejectTags[0]!.replace(/_/g, " ")
      : null;

  return (
    <div
      className={clsx(
        "pointer-events-auto flex min-h-[44px] min-w-[44px] flex-col items-center justify-center select-none",
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
        <div className="relative flex shrink-0 items-center justify-center">
          <div
            className={clsx(
              "relative inline-flex h-11 w-11 shrink-0 items-center justify-center",
              isCandidate &&
                (loadPickMode
                  ? "shadow-[0_0_16px_rgba(245,158,11,0.5)]"
                  : "shadow-[0_0_18px_rgba(248,113,113,0.55)]"),
            )}
          >
            {rankForLoad != null && rankForLoad > 0 && (
              <span
                className={clsx(
                  "pointer-events-none absolute -left-1 -top-1 z-[3] flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-[rgba(10,10,10,0.9)] px-[3px] text-[8px] font-extrabold leading-none text-white shadow-sm tabular-nums",
                  rankForLoad <= 3
                    ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                    : "bg-orange-700",
                )}
                aria-hidden
              >
                {rankForLoad}
              </span>
            )}
            <TruckMarkerIcon
              className="h-11 w-11 shrink-0"
              ringStatus={driver.ringStatus}
              statusStrokeOverride={loadPickMode ? "#94a3b8" : undefined}
            />
            {!loadPickMode && (
              <RingStatusNotificationBadge status={driver.ringStatus} size="sm" />
            )}
            <span className="pointer-events-none absolute bottom-0 left-0 inline-flex items-baseline gap-0 rounded bg-black/55 px-[2px] text-[6px] font-bold leading-none text-white tabular-nums shadow-sm">
              {driver.initials}
            </span>
          </div>
        </div>
        <span className="mt-0.5 max-w-[88px] truncate text-center text-[8px] font-medium text-slate-400">
          {driver.name.split(" ")[0]}
        </span>
      </div>
    </div>
  );
}
