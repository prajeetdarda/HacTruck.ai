"use client";

import { AnimatePresence, motion } from "motion/react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useMatchLoad } from "@/components/providers/MatchLoadProvider";
import { LOADS } from "@/lib/backend-db";
import { Z_PANEL } from "@/lib/layout-tokens";

/** Covers the map column while the match-load API (LLM) runs. */
export function LlmMatchLoadingOverlay() {
  const match = useMatchLoad();
  const { state } = useDispatchContext();

  const load =
    state.selectedLoadId != null
      ? LOADS.find((l) => l.id === state.selectedLoadId)
      : null;

  const show =
    match.status === "loading" &&
    load != null &&
    match.loadId === load.id;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="llm-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--surface-0)]/88 px-6 backdrop-blur-md"
          style={{ zIndex: Z_PANEL + 5 }}
        >
          <div
            className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-500"
            aria-hidden
          />
          <div className="max-w-sm text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Finding best drivers
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Running dispatch AI on{" "}
              <span className="font-mono text-[var(--foreground)]">
                {load.id}
              </span>{" "}
              — fleet, trips, vehicles, and alerts.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
