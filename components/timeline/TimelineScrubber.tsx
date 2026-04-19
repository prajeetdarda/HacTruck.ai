"use client";

import { motion } from "motion/react";
import { useMemo, useRef } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useNow } from "@/hooks/useNow";

export function TimelineScrubber() {
  const { selectedLoad, state, setSimulatedHoursOffset } = useDispatchContext();
  const now = useNow(30_000);
  const scrubRaf = useRef<number | null>(null);

  const label = useMemo(() => {
    const d = new Date(now + state.simulatedHoursOffset * 3600000);
    return d.toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [state.simulatedHoursOffset, now]);

  return (
    <div className="flex min-h-[var(--timeline-region-height)] shrink-0 flex-col justify-center border-t border-[var(--border)] bg-[var(--surface-1)]/90 px-6 py-3">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="uppercase tracking-[0.15em] text-[var(--muted)]">
            Simulation timeline
          </span>
          <motion.span
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="shrink-0 text-right font-mono text-zinc-600 dark:text-zinc-400"
          >
            Now + {state.simulatedHoursOffset.toFixed(1)}h · {label}
            {!selectedLoad && (
              <span className="ml-2 hidden text-zinc-600 sm:inline dark:text-zinc-500">
                (fleet clock)
              </span>
            )}
          </motion.span>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-10 shrink-0 text-[10px] text-zinc-500 dark:text-zinc-600">
            Now
          </span>
          <input
            type="range"
            min={0}
            max={24}
            step={0.25}
            value={state.simulatedHoursOffset}
            onChange={(e) => {
              const hours = parseFloat(e.target.value);
              if (scrubRaf.current != null) {
                cancelAnimationFrame(scrubRaf.current);
              }
              scrubRaf.current = requestAnimationFrame(() => {
                scrubRaf.current = null;
                setSimulatedHoursOffset(hours);
              });
            }}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-sky-500 dark:bg-zinc-800"
          />
          <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500 dark:text-zinc-600">
            +24h
          </span>
        </div>
      </div>
    </div>
  );
}
