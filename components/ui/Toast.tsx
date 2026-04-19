"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { formatEquipment } from "@/lib/format";
import { Z_TOAST } from "@/lib/layout-tokens";
import { ASSIGN_UNDO_TOAST_MS } from "@/lib/types";

export function Toast() {
  const { state, undo, dismissToast } = useDispatchContext();
  const [, setTick] = useState(0);
  const toast = state.toast;

  useEffect(() => {
    if (!toast) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [toast?.id]);

  const remainingMs = toast
    ? Math.max(0, toast.undoDeadlineMs - Date.now())
    : 0;
  const progress = toast
    ? Math.min(1, Math.max(0, remainingMs / ASSIGN_UNDO_TOAST_MS))
    : 0;
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const summary = toast?.summary;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-16 flex justify-center px-4"
      style={{ zIndex: Z_TOAST }}
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            layout
            initial={{ y: -28, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -18, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-500/35 bg-[var(--surface-2)]/95 shadow-2xl shadow-black/20 backdrop-blur-md dark:shadow-black/55"
          >
            <div className="flex gap-4 p-4">
              <motion.div
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-500 text-base font-bold tracking-tight text-white shadow-lg shadow-emerald-600/30"
                initial={{ scale: 0.5, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 440, damping: 22 }}
              >
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-white/50"
                  animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="relative drop-shadow-sm">
                  {summary?.driverInitials ?? "—"}
                </span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {toast.message}
                  </p>
                  {summary && (
                    <motion.span
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 }}
                      className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-800 dark:text-emerald-200"
                    >
                      Selected
                    </motion.span>
                  )}
                </div>
                {toast.sub && (
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {toast.sub}
                  </p>
                )}
                {summary ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06, duration: 0.25 }}
                    className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-black/[0.06] bg-black/[0.03] p-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.04] sm:grid-cols-2"
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                        Load
                      </p>
                      <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                        {summary.loadId}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {summary.loadRoute}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        {formatEquipment(summary.loadEquipment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                        Driver
                      </p>
                      <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                        {summary.driverName}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {summary.truckLabel}
                      </p>
                      {summary.matchPercent != null ? (
                        <p className="mt-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                          {summary.matchPercent}% match for this load
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                {state.pendingUndo && (
                  <button
                    type="button"
                    onClick={undo}
                    className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/15"
                  >
                    Undo
                    <span className="ml-1.5 tabular-nums text-sky-600/90 dark:text-sky-400/90">
                      {secondsLeft}s
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismissToast}
                  className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-black/[0.05] hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>

            {state.pendingUndo ? (
              <div className="h-1 w-full bg-black/[0.06] dark:bg-white/[0.08]">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-sky-500"
                  initial={false}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.12, ease: "linear" }}
                />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
