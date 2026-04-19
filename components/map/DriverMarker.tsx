"use client";

import clsx from "clsx";
import { TruckMarkerIcon } from "@/components/icons/MapMarkers";
import type { Driver, RankedDriver } from "@/lib/types";

const RING: Record<Driver["ringStatus"], string> = {
  available: "#34d399",
  constrained: "#fbbf24",
  unavailable: "#f87171",
  en_route: "#38bdf8",
  off_duty: "#71717a",
};

type Props = {
  driver: Driver;
  dimmed: boolean;
  isCandidate: boolean;
  isHovered: boolean;
  /** When a load + another driver are focused, de-emphasize this marker. */
  fadedBySelection?: boolean;
  ranked?: RankedDriver;
  dragging: boolean;
  /** 1-based rank for this load (from full ranked list); only when a load is selected. */
  rankForLoad?: number | null;
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
}: Props) {
  const ring = RING[driver.ringStatus];
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
        "pointer-events-auto flex min-h-[36px] min-w-[36px] flex-col items-center justify-center select-none",
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
            "relative flex h-8 w-8 shrink-0 items-center justify-center",
            isCandidate &&
              "drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]",
          )}
        >
          <div
            className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border-solid bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:bg-zinc-950 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            style={{
              border: `${isCandidate ? 2 : 1}px solid ${ring}`,
            }}
          >
            <TruckMarkerIcon
              className="h-[18px] w-[18px] shrink-0"
              style={{ color: ring, opacity: isHovered ? 1 : 0.92 }}
            />
            <span className="pointer-events-none absolute bottom-px left-px inline-flex items-baseline gap-0 rounded bg-black/10 px-[1px] text-[6px] font-bold leading-none text-zinc-900 tabular-nums dark:bg-black/55 dark:text-zinc-100">
              {driver.initials}
              {rankForLoad != null && rankForLoad > 0 && (
                <sup className="ml-px text-[5px] font-extrabold text-sky-400">
                  {rankForLoad}
                </sup>
              )}
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
