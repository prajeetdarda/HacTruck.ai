"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useNow } from "@/hooks/useNow";
import { Z_MAP } from "@/lib/layout-tokens";

const TIMELINE_MAX_H = 24;
const AUTOPLAY_JUMP_H = 2;
const AUTOPLAY_STEP_MS = 400;

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
      const next = Math.min(TIMELINE_MAX_H, autoplayPosRef.current + AUTOPLAY_JUMP_H);
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
    return d.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
  }, [state.simulatedHoursOffset, now]);

  const progressPct = (state.simulatedHoursOffset / TIMELINE_MAX_H) * 100;

  return (
    <div
      className="glass-panel absolute inset-x-0 bottom-0 flex items-center gap-4 px-6"
      style={{
        height: "var(--timeline-region-height)",
        zIndex: Z_MAP + 5,
      }}
    >
      {/* Top edge amber glow accent */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.2) 25%, rgba(245,158,11,0.35) 50%, rgba(245,158,11,0.2) 75%, transparent 100%)",
        }}
        aria-hidden
      />

      {/* Play/Pause */}
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
        aria-label={autoplay ? "Pause timeline autoplay" : "Autoplay timeline from now through 24h"}
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
          autoplay
            ? "border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
            : "border-[var(--glass-border)] bg-[var(--surface-2)] text-slate-500 hover:border-amber-500/35 hover:text-amber-400",
        )}
      >
        {autoplay ? (
          <PauseGlyph className="h-3.5 w-3.5" />
        ) : (
          <PlayGlyph className="ml-px h-3.5 w-3.5" />
        )}
      </button>

      {/* Now label */}
      <span className="w-10 shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-600">
        Now
      </span>

      {/* Range slider */}
      <input
        type="range"
        min={0}
        max={24}
        step={0.25}
        value={state.simulatedHoursOffset}
        style={{ "--range-progress": `${progressPct}%` } as React.CSSProperties}
        onChange={(e) => {
          stopAutoplay();
          const hours = parseFloat(e.target.value);
          if (scrubRaf.current != null) cancelAnimationFrame(scrubRaf.current);
          scrubRaf.current = requestAnimationFrame(() => {
            scrubRaf.current = null;
            setSimulatedHoursOffset(hours);
          });
        }}
        className="h-3 flex-1 cursor-pointer"
      />

      {/* +24h label */}
      <span className="w-10 shrink-0 text-right text-[10px] font-medium tracking-wider text-slate-600">
        +24h
      </span>

      {/* Time display */}
      <motion.div
        key={label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden shrink-0 text-right sm:block"
      >
        <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
          Simulation
        </p>
        <p className="font-mono text-sm tabular-nums text-slate-300/80">
          +{state.simulatedHoursOffset.toFixed(1)}h · {label}
          {!selectedLoad && (
            <span className="ml-1.5 hidden text-slate-600 sm:inline">(fleet clock)</span>
          )}
        </p>
      </motion.div>
    </div>
  );
}
