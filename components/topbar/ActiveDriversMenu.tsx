"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { formatEquipment } from "@/lib/format";
import { Z_ALERTS } from "@/lib/layout-tokens";
import type { Driver } from "@/lib/types";

function ringLabel(status: Driver["ringStatus"]): string {
  switch (status) {
    case "available":
      return "Available";
    case "en_route":
      return "En route";
    default:
      return status.replace("_", " ");
  }
}

function ringDot(status: Driver["ringStatus"]): string {
  if (status === "available") return "bg-emerald-400";
  if (status === "en_route") return "bg-sky-400";
  return "bg-zinc-400";
}

export function ActiveDriversMenu() {
  const {
    activeDrivers,
    activeDriverCount,
    selectDriver,
    state,
  } = useDispatchContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef} style={{ zIndex: Z_ALERTS }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="active-drivers-panel"
        title="View active drivers"
        className="group flex items-end gap-1 pb-0.5 text-left outline-none transition-opacity hover:opacity-90 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
      >
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Active drivers
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums leading-none text-sky-400 sm:text-xl">
              {activeDriverCount}
            </span>
            <ChevronIcon
              className={clsx(
                "mb-0.5 size-3.5 shrink-0 text-zinc-500 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="active-drivers-panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label="Active drivers"
            className="absolute right-0 top-[calc(100%+6px)] w-[min(100vw-2rem,340px)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/98 shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur-md dark:shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
          >
            <div className="border-b border-[var(--border)] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                On duty now
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-500">
                Available or en route — scrub timeline to see HOS shift
              </p>
            </div>
            <ul className="max-h-[min(60vh,320px)] divide-y divide-[var(--border)] overflow-y-auto">
              {activeDrivers.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-zinc-500">
                  No active drivers (all off duty, constrained, or out of service).
                </li>
              ) : (
                activeDrivers.map((d) => {
                  const focused = state.selectedDriverId === d.id;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => {
                          selectDriver(d.id);
                          setOpen(false);
                        }}
                        className={clsx(
                          "flex w-full gap-2 px-3 py-2.5 text-left transition-colors",
                          focused
                            ? "bg-sky-500/10"
                            : "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
                        )}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-inner"
                          style={{
                            background:
                              "linear-gradient(145deg, rgb(39 99 235), rgb(14 116 144))",
                          }}
                        >
                          {d.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium text-[var(--foreground)]">
                              {d.name}
                            </span>
                            {focused && (
                              <span className="shrink-0 rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-600 dark:text-sky-400">
                                Focused
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-500">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className={clsx(
                                  "h-1.5 w-1.5 rounded-full",
                                  ringDot(d.ringStatus),
                                )}
                              />
                              {ringLabel(d.ringStatus)}
                            </span>
                            <span className="text-zinc-400">·</span>
                            <span>{formatEquipment(d.equipment)}</span>
                            <span className="text-zinc-400">·</span>
                            <span className="tabular-nums">
                              {d.hosRemainingHours.toFixed(1)}h HOS
                            </span>
                          </span>
                          {d.currentLoadEndingInHours != null &&
                            d.ringStatus === "en_route" && (
                              <span className="mt-1 block text-[10px] text-sky-600/90 dark:text-sky-400/90">
                                Current leg ~{d.currentLoadEndingInHours.toFixed(1)}h to clear
                              </span>
                            )}
                          <span className="mt-0.5 block truncate text-[10px] text-zinc-500 dark:text-zinc-600">
                            {d.truckLabel}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
