"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { Z_ALERTS } from "@/lib/layout-tokens";
import type { ProactiveAlert } from "@/lib/types";

const KIND_LABEL: Record<ProactiveAlert["kind"], string> = {
  delay: "Delay",
  deviation: "Deviation",
  idle: "Idle",
  weather: "Weather",
  deadline: "Pickup",
  hos: "HOS",
  breakdown: "Equipment",
};

function severityDot(sev: ProactiveAlert["severity"]) {
  if (sev === "critical") return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.55)]";
  if (sev === "warning") return "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]";
  return "bg-sky-400/90";
}

export function AlertCenter() {
  const { proactiveAlerts, dismissAlert, clearDismissedAlerts, selectDriver } =
    useDispatchContext();
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

  const critical = proactiveAlerts.filter((a) => a.severity === "critical").length;
  const badge =
    critical > 0 ? critical : proactiveAlerts.length;

  return (
    <div className="relative shrink-0" ref={rootRef} style={{ zIndex: Z_ALERTS }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-1)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        aria-label={`Proactive alerts, ${proactiveAlerts.length} active`}
      >
        <BellIcon />
        {badge > 0 && (
          <span
            className={clsx(
              "absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ring-2 ring-[var(--surface-1)]",
              critical > 0
                ? "bg-red-500 text-white"
                : "bg-amber-500/90 text-zinc-950",
            )}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-[calc(100%+6px)] w-[min(100vw-2rem,380px)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/98 shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur-md dark:shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            role="dialog"
            aria-label="Proactive alerts"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Proactive alerts
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-500">
                  Know before the customer calls
                </p>
              </div>
              {proactiveAlerts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    proactiveAlerts.forEach((a) => dismissAlert(a.id));
                    setOpen(false);
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-[min(52vh,360px)] overflow-y-auto">
              {proactiveAlerts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-500">
                  No active alerts. Scrub the timeline or wait for the next risk window.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {proactiveAlerts.map((a) => (
                    <li key={a.id} className="px-3 py-2.5">
                      <div className="flex gap-2">
                        <span
                          className={clsx(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            severityDot(a.severity),
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                              {KIND_LABEL[a.kind]}
                            </span>
                            {a.severity === "critical" && (
                              <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-500">
                                Critical
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                            {a.title}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-zinc-600 dark:text-zinc-500">
                            {a.detail}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {a.driverId && (
                              <button
                                type="button"
                                onClick={() => {
                                  selectDriver(a.driverId!);
                                  setOpen(false);
                                }}
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 hover:border-sky-500/50 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
                              >
                                Focus driver
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => dismissAlert(a.id)}
                              className="rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 hover:bg-black/[0.04] dark:hover:bg-white/5"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-[var(--border)] px-3 py-2">
              <button
                type="button"
                onClick={() => clearDismissedAlerts()}
                className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-400"
              >
                Restore dismissed
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
