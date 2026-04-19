"use client";

import clsx from "clsx";
import { useEffect } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useHover } from "@/components/providers/HoverProvider";
import { LoadCard } from "./LoadCard";

const RAIL_W = "w-14";
const PANEL_W = "w-[260px]";

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

  const sorted = [...openLoads].sort(
    (a, b) => a.pickupDeadline - b.pickupDeadline,
  );
  const openCount = sorted.length;

  if (!expanded) {
    return (
      <aside
        className={clsx(
          RAIL_W,
          "flex shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-1)]/80 transition-[width] duration-200 ease-out",
        )}
      >
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            setLoadPinsOnMap(true);
          }}
          className="group flex flex-1 flex-col items-center gap-3 border-b border-transparent py-4 outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring-focus)]"
          aria-expanded={false}
          aria-controls="load-inbox-panel"
          aria-label={`Open load inbox, ${openCount} open loads`}
        >
          <span
            className="select-none text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 [writing-mode:vertical-rl] group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400"
            style={{ textOrientation: "mixed" }}
          >
            Inbox
          </span>
          <span
            className={clsx(
              "flex min-h-8 min-w-8 items-center justify-center rounded-full text-sm font-bold tabular-nums ring-2 transition-transform group-hover:scale-105",
              openCount > 0
                ? "bg-amber-500/20 text-amber-300 ring-amber-500/35"
                : "bg-zinc-200 text-zinc-600 ring-zinc-400/50 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-600/50",
            )}
          >
            {openCount}
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      id="load-inbox-panel"
      className={clsx(
        PANEL_W,
        "flex shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-1)]/80 transition-[width] duration-200 ease-out",
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Load inbox
          </h2>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500">
            Sorted by pickup urgency
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setLoadPinsOnMap(false);
          }}
          className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
          aria-label="Collapse load inbox"
        >
          Hide
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
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
          <p className="px-2 py-8 text-center text-sm text-zinc-600 dark:text-zinc-500">
            All loads assigned. Nice work.
          </p>
        )}
      </div>
    </aside>
  );
}
