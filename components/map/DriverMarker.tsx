"use client";

import clsx from "clsx";
import Image from "next/image";
import type { Driver, RankedDriver } from "@/lib/types";

const RING: Record<Driver["ringStatus"], string> = {
  available: "#34d399",
  constrained: "#fbbf24",
  unavailable: "#f87171",
  en_route: "#38bdf8",
  off_duty: "#71717a",
};

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

  const shellShadow = isCandidate
    ? `drop-shadow(0 10px 12px rgba(15, 23, 42, 0.28)) drop-shadow(0 0 18px ${hexToRgba(ring, 0.34)})`
    : "drop-shadow(0 8px 10px rgba(15, 23, 42, 0.22))";
  const halo = `radial-gradient(circle, ${hexToRgba(ring, isHovered ? 0.42 : 0.28)} 0%, ${hexToRgba(ring, isCandidate ? 0.18 : 0.12)} 52%, rgba(255, 255, 255, 0) 76%)`;

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
            "relative flex h-12 w-12 shrink-0 items-center justify-center transition-transform duration-200",
            isHovered && "scale-[1.06]",
          )}
        >
          <div
            className="absolute inset-[7px] rounded-full blur-[12px]"
            style={{
              background: halo,
            }}
          />
          <div className="absolute inset-x-2 bottom-[7px] h-[9px] rounded-full bg-slate-950/24 blur-[8px]" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center">
            <Image
              src="/markers/red-truck.png"
              alt=""
              aria-hidden
              width={48}
              height={46}
              sizes="48px"
              className="pointer-events-none h-auto w-[46px] shrink-0 select-none"
              style={{
                filter: shellShadow,
                transform: "translate3d(-1px, 1px, 0)",
                opacity: isHovered ? 1 : 0.96,
              }}
            />
            <span
              className="absolute right-[3px] top-[3px] size-2 rounded-full border border-white/75 shadow-[0_2px_6px_rgba(15,23,42,0.28)]"
              style={{ backgroundColor: ring }}
            />
            <span className="pointer-events-none absolute bottom-[1px] left-1/2 inline-flex -translate-x-1/2 items-baseline gap-0 rounded-full border border-white/12 bg-zinc-950/76 px-1 py-[1px] text-[6px] font-bold leading-none text-white shadow-[0_4px_10px_rgba(15,23,42,0.28)] backdrop-blur-md tabular-nums">
              {driver.initials}
              {rankForLoad != null && rankForLoad > 0 && (
                <sup className="ml-px text-[5px] font-extrabold text-sky-300">
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
