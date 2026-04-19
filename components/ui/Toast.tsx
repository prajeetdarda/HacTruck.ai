"use client";

import { AnimatePresence, motion } from "motion/react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { Z_TOAST } from "@/lib/layout-tokens";

export function Toast() {
  const { state, undo, dismissToast } = useDispatchContext();

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-16 flex justify-center px-4"
      style={{ zIndex: Z_TOAST }}
    >
      <AnimatePresence>
        {state.toast && (
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className="pointer-events-auto flex max-w-lg items-center gap-4 rounded-xl border border-emerald-500/30 bg-[var(--surface-2)]/95 px-4 py-3 shadow-2xl shadow-black/15 backdrop-blur-md dark:shadow-black/50"
          >
            <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {state.toast.message}
              </p>
              {state.toast.sub && (
                <p className="text-sm text-zinc-600 dark:text-zinc-500">
                  {state.toast.sub}
                </p>
              )}
            </div>
            {state.pendingUndo && (
              <button
                type="button"
                onClick={undo}
                className="shrink-0 rounded-lg border border-black/10 bg-black/[0.04] px-3 py-1.5 text-sm font-medium text-sky-600 transition-colors hover:bg-black/[0.08] dark:border-white/10 dark:bg-white/5 dark:text-sky-400 dark:hover:bg-white/10"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={dismissToast}
              className="shrink-0 text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
