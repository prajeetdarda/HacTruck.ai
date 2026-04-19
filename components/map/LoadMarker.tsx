"use client";

import clsx from "clsx";
import { LoadCargoMarkerIcon } from "@/components/icons/MapMarkers";
import type { Load } from "@/lib/types";

type Props = {
  load: Load;
  active: boolean;
  /** Inbox list hover + load pins on — fuchsia cue on the map pin */
  inboxHover?: boolean;
};

export function LoadMarkerContent({ load, active, inboxHover = false }: Props) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center transition-[transform,filter] duration-150 ease-out",
        inboxHover && "z-[2] scale-110",
      )}
    >
      <div
        className={clsx(
          "relative flex h-11 w-11 shrink-0 items-center justify-center",
          active && "drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]",
          inboxHover &&
            "drop-shadow-[0_0_18px_rgba(217,70,239,0.55),0_0_28px_rgba(217,70,239,0.35)]",
        )}
      >
        {inboxHover && !active ? (
          <>
            <div className="absolute h-11 w-11 rounded-full border-2 border-fuchsia-400/75 bg-fuchsia-500/10 shadow-[inset_0_0_12px_rgba(232,121,249,0.25)]" />
            <div
              className="absolute h-[52px] w-[52px] rounded-full border border-fuchsia-300/50"
              style={{
                animation:
                  "map-origin-pulse 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite",
              }}
            />
          </>
        ) : null}
        {active ? (
          <>
            <div
              className="absolute h-9 w-9 rounded-full border-2 border-amber-400/55"
              style={{
                animation:
                  "map-origin-pulse 2.15s cubic-bezier(0.22, 1, 0.36, 1) infinite",
              }}
            />
            <div
              className="absolute h-9 w-9 rounded-full border-2 border-amber-300/45"
              style={{
                animation:
                  "map-origin-pulse 2.15s cubic-bezier(0.22, 1, 0.36, 1) infinite",
                animationDelay: "0.65s",
              }}
            />
          </>
        ) : null}
        {inboxHover && active ? (
          <div
            className="pointer-events-none absolute -inset-2 z-[5] rounded-2xl border-2 border-dashed border-fuchsia-400/80 bg-fuchsia-500/[0.08] shadow-[0_0_20px_rgba(217,70,239,0.45)]"
            aria-hidden
          />
        ) : null}
        <div
          className={clsx(
            "relative z-10 box-border flex h-10 w-10 items-center justify-center overflow-visible rounded-xl border-2 border-solid bg-gradient-to-b from-zinc-100 to-zinc-200 shadow-[0_4px_14px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] dark:from-zinc-800 dark:to-zinc-950 dark:shadow-[0_6px_18px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
            active
              ? "border-sky-500/70 ring-2 ring-sky-400/40 ring-offset-2 ring-offset-[var(--surface-0)]"
              : "border-amber-500/55",
          )}
        >
          <LoadCargoMarkerIcon className="h-8 w-8 shrink-0 drop-shadow-sm" />
          <span className="pointer-events-none absolute bottom-0.5 left-0.5 inline-flex max-w-[calc(100%-4px)] truncate rounded bg-black/18 px-[2px] text-[6px] font-bold leading-none text-white tabular-nums shadow-sm dark:bg-black/55">
            {load.id}
          </span>
        </div>
      </div>
      <span className="mt-0.5 max-w-[92px] truncate text-center text-[8px] font-medium text-zinc-600 dark:text-zinc-400">
        Pickup
      </span>
    </div>
  );
}
