"use client";

import { AnimatePresence, motion } from "motion/react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useMatchLoad } from "@/components/providers/MatchLoadProvider";
import { LOADS } from "@/lib/backend-db";
import { Z_PANEL } from "@/lib/layout-tokens";

/** Covers the map while the dispatch AI (LLM) runs. */
export function LlmMatchLoadingOverlay() {
  const match = useMatchLoad();
  const { state } = useDispatchContext();

  const load =
    state.selectedLoadId != null
      ? LOADS.find((l) => l.id === state.selectedLoadId)
      : null;

  const show =
    match.status === "loading" && load != null && match.loadId === load.id;

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
          className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-5 px-6"
          style={{
            zIndex: Z_PANEL + 5,
            background: "rgba(10, 10, 10, 0.9)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Animated spinner — amber */}
          <div className="relative flex items-center justify-center">
            <div
              className="h-12 w-12 shrink-0 animate-spin rounded-full border-2 border-amber-500/25 border-t-amber-400"
              style={{ boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)" }}
              aria-hidden
            />
            <div className="absolute h-6 w-6 rounded-full bg-amber-400/10" aria-hidden />
          </div>
          <div className="max-w-sm text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Running dispatch AI
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Analyzing{" "}
              <span className="font-mono text-amber-700 dark:text-amber-300">{load.id}</span>
              {" "}— fleet data, trips, vehicles, and alerts.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
