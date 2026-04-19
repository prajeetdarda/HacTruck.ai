"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useNow } from "@/hooks/useNow";

const PLAY_SPEED_HRS_PER_SEC = 1.5;
const PLAY_MAX_HOURS = 10;

export function TimelineScrubber() {
  const { selectedLoad, state, setSimulatedHoursOffset } = useDispatchContext();
  const now = useNow(30_000);
  const scrubRaf = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const playRafRef = useRef<number | null>(null);
  const playStartRef = useRef<{ wallMs: number; startOffset: number } | null>(null);

  const label = useMemo(() => {
    const d = new Date(now + state.simulatedHoursOffset * 3600000);
    return d.toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [state.simulatedHoursOffset, now]);

  // Auto-play when a new assignment is confirmed
  const prevConfirmedIdRef = useRef<string | null>(null);
  useEffect(() => {
    const cur = state.confirmedAssign
      ? `${state.confirmedAssign.loadId}:${state.confirmedAssign.driverId}`
      : null;
    if (cur && cur !== prevConfirmedIdRef.current) {
      setSimulatedHoursOffset(0);
      setIsPlaying(true);
    }
    prevConfirmedIdRef.current = cur;
  }, [state.confirmedAssign, setSimulatedHoursOffset]);

  // RAF animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (playRafRef.current != null) cancelAnimationFrame(playRafRef.current);
      playStartRef.current = null;
      return;
    }

    function tick(wallMs: number) {
      if (!playStartRef.current) {
        playStartRef.current = { wallMs, startOffset: 0 };
      }
      const elapsed = (wallMs - playStartRef.current.wallMs) / 1000;
      const next = Math.min(
        playStartRef.current.startOffset + elapsed * PLAY_SPEED_HRS_PER_SEC,
        PLAY_MAX_HOURS,
      );
      setSimulatedHoursOffset(next);
      if (next < PLAY_MAX_HOURS) {
        playRafRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
      }
    }

    playRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRafRef.current != null) cancelAnimationFrame(playRafRef.current);
    };
  }, [isPlaying, setSimulatedHoursOffset]);

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
          <button
            type="button"
            aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
            onClick={() => setIsPlaying((p) => !p)}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 transition-colors hover:bg-sky-500/25 dark:text-sky-400"
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="1.5" y="1.5" width="3" height="9" rx="1" />
                <rect x="7.5" y="1.5" width="3" height="9" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.5 1.5l8 4.5-8 4.5V1.5z" />
              </svg>
            )}
          </button>
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
              setIsPlaying(false);
              const hours = parseFloat(e.target.value);
              if (scrubRaf.current != null) cancelAnimationFrame(scrubRaf.current);
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
