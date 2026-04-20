"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useHover } from "@/components/providers/HoverProvider";
import { LoadCard } from "./LoadCard";
import { Z_MAP } from "@/lib/layout-tokens";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={clsx("size-3 shrink-0 text-slate-500 transition-transform duration-200", open && "rotate-180")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function LoadSidebar() {
  const {
    openLoads,
    state,
    selectLoad,
    selectedLoad,
    loadInboxExpanded: expanded,
    setLoadInboxExpanded: setExpanded,
    setLoadPinsOnMap,
  } = useDispatchContext();
  const { setHoveredLoadId } = useHover();

  useEffect(() => {
    if (!expanded) setHoveredLoadId(null);
  }, [expanded, setHoveredLoadId]);

  const sorted = [...openLoads].sort((a, b) => a.pickupDeadline - b.pickupDeadline);
  const openCount = sorted.length;

  return (
    <div
      className="absolute left-3"
      style={{ top: "60px", zIndex: Z_MAP + 5 }}
    >
      {/* Pill trigger button — always visible */}
      <button
        type="button"
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          setLoadPinsOnMap(next);
        }}
        aria-expanded={expanded}
        aria-controls="load-inbox-panel"
        aria-label={`${expanded ? "Collapse" : "Open"} load inbox, ${openCount} open loads`}
        className={clsx(
          "glass-panel flex items-center gap-2 rounded-full px-3.5 py-2 outline-none transition-all",
          "hover:border-amber-500/30 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
          expanded && "border-amber-500/30",
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          Loads
        </span>
        <span
          className={clsx(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
            openCount > 0
              ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
              : "bg-[var(--surface-2)] text-[var(--muted)] ring-1 ring-[var(--glass-border)]",
          )}
        >
          {openCount}
        </span>
        <ChevronIcon open={expanded} />
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id="load-inbox-panel"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="glass-panel ops-grid mt-1.5 w-[280px] overflow-hidden rounded-2xl"
            style={{ maxHeight: "min(520px, calc(100dvh - 160px))" }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-border)] bg-gradient-to-b from-amber-500/[0.05] to-transparent px-3 py-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">
                  Load inbox
                </h2>
                {openCount > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-px text-[10px] font-bold tabular-nums text-amber-300">
                    {openCount}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-[var(--muted)]">Sorted by urgency</p>
            </div>

            {/* Load cards */}
            <div
              className="flex flex-col gap-2 overflow-y-auto p-2.5"
              style={{ maxHeight: "min(440px, calc(100dvh - 220px))" }}
            >
              {sorted.map((load, index) => (
                <LoadCard
                  key={load.id}
                  load={load}
                  index={index}
                  active={selectedLoad?.id === load.id}
                  assigned={false}
                  offsetHours={state.simulatedHoursOffset}
                  onPointerEnter={() => setHoveredLoadId(load.id)}
                  onPointerLeave={() => setHoveredLoadId(null)}
                  onClick={() => {
                    setLoadPinsOnMap(true);
                    selectLoad(selectedLoad?.id === load.id ? null : load.id, {
                      source: "inbox",
                    });
                  }}
                />
              ))}
              {sorted.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-[var(--muted)]">
                  All loads assigned.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
