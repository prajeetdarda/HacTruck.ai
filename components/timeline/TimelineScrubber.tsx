"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useNow } from "@/hooks/useNow";

const TIMELINE_MAX_H = 24;
/** Each autoplay tick advances the simulation by this many hours (use 1 or 2). */
const AUTOPLAY_JUMP_H = 2;
/** Pause between hourly jumps so each step reads clearly. */
const AUTOPLAY_STEP_MS = 400;

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

export function TimelineScrubber() {
  const { selectedLoad, state, setSimulatedHoursOffset } = useDispatchContext();
  const now = useNow(30_000);
  const scrubRaf = useRef<number | null>(null);
  const autoplayRaf = useRef<number | null>(null);
  const autoplayPosRef = useRef(0);
  const [autoplay, setAutoplay] = useState(false);

  const stopAutoplay = useCallback(() => {
    setAutoplay(false);
    if (autoplayRaf.current != null) {
      cancelAnimationFrame(autoplayRaf.current);
      autoplayRaf.current = null;
    }
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    autoplayPosRef.current = 0;
    let lastStepWall = performance.now();
    const tick = (wall: number) => {
      if (wall - lastStepWall < AUTOPLAY_STEP_MS) {
        autoplayRaf.current = requestAnimationFrame(tick);
        return;
      }
      lastStepWall = wall;
      const next = Math.min(
        TIMELINE_MAX_H,
        autoplayPosRef.current + AUTOPLAY_JUMP_H,
      );
      autoplayPosRef.current = next;
      setSimulatedHoursOffset(next);
      if (next >= TIMELINE_MAX_H) {
        autoplayRaf.current = null;
        setAutoplay(false);
        return;
      }
      autoplayRaf.current = requestAnimationFrame(tick);
    };
    autoplayRaf.current = requestAnimationFrame(tick);
    return () => {
      if (autoplayRaf.current != null) {
        cancelAnimationFrame(autoplayRaf.current);
        autoplayRaf.current = null;
      }
    };
  }, [autoplay, setSimulatedHoursOffset]);

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
          <button
            type="button"
            onClick={() => {
              if (autoplay) {
                stopAutoplay();
                return;
              }
              setSimulatedHoursOffset(0);
              setAutoplay(true);
            }}
            aria-pressed={autoplay}
            aria-label={
              autoplay
                ? "Pause timeline autoplay"
                : "Autoplay timeline from now through 24 hours"
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] data-[on=true]:border-sky-500/50 data-[on=true]:text-sky-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200 dark:data-[on=true]:text-sky-300"
            data-on={autoplay ? "true" : undefined}
          >
            {autoplay ? (
              <PauseGlyph className="h-3.5 w-3.5" />
            ) : (
              <PlayGlyph className="ml-px h-3.5 w-3.5" />
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
              stopAutoplay();
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
