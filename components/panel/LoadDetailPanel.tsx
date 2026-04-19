"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useNow } from "@/hooks/useNow";
import { formatCurrency, formatEquipment } from "@/lib/format";
import { Z_PANEL } from "@/lib/layout-tokens";
import { isLoadOverdue } from "@/lib/simulation";

export function LoadDetailPanel() {
  const { state, selectedLoad, selectLoad } = useDispatchContext();
  const now = useNow(2000);

  const overdue = useMemo(
    () =>
      selectedLoad
        ? isLoadOverdue(selectedLoad, state.simulatedHoursOffset, now)
        : false,
    [selectedLoad, state.simulatedHoursOffset, now],
  );

  const msLeft = selectedLoad
    ? selectedLoad.pickupDeadline - now - state.simulatedHoursOffset * 3600000
    : 0;
  const urgent = msLeft < 2 * 3600000 && !overdue;

  return (
    <AnimatePresence mode="wait">
      {selectedLoad && !state.selectedDriverId && (
        <motion.aside
          key={selectedLoad.id}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="absolute inset-y-0 right-0 flex w-[min(380px,100%)] flex-col border-l border-[var(--border)] bg-[var(--surface-2)]/98 shadow-[-16px_0_48px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[-16px_0_48px_rgba(0,0,0,0.4)]"
          style={{ zIndex: Z_PANEL }}
        >
          <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Load
              </p>
              <h2 className="mt-1 font-mono text-xl font-semibold text-[var(--foreground)]">
                {selectedLoad.id}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">
                {selectedLoad.origin}{" "}
                <span className="text-zinc-500 dark:text-zinc-600">→</span>{" "}
                {selectedLoad.destination}
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectLoad(null)}
              className="rounded-lg p-2 text-zinc-600 outline-none transition-colors hover:bg-black/[0.04] hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <section className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Pickup window
                </h3>
                <p className="mt-1 text-sm tabular-nums text-zinc-800 dark:text-zinc-300">
                  <PickupCountdown msLeft={msLeft} overdue={overdue} />
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  overdue
                    ? "bg-red-500/20 text-red-400"
                    : urgent
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-zinc-200/90 text-zinc-700 dark:bg-zinc-700/80 dark:text-zinc-400"
                }`}
              >
                {overdue ? "Overdue" : urgent ? "Urgent" : "Scheduled"}
              </span>
            </section>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase text-[var(--muted)]">
                  Equipment
                </dt>
                <dd className="text-zinc-800 dark:text-zinc-300">
                  {formatEquipment(selectedLoad.equipment)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-[var(--muted)]">
                  Revenue
                </dt>
                <dd className="tabular-nums text-emerald-500/90">
                  {formatCurrency(selectedLoad.revenue)}
                </dd>
              </div>
            </dl>

            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
              Click a ranked driver on the map to compare fit, or drag a top
              candidate onto this load&apos;s pickup pin to assign.
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PickupCountdown({
  msLeft,
  overdue,
}: {
  msLeft: number;
  overdue: boolean;
}) {
  if (overdue) {
    const late = Math.abs(msLeft);
    const h = Math.floor(late / 3600000);
    const m = Math.floor((late % 3600000) / 60000);
    return (
      <span className="text-red-400">
        {h}h {m}m past deadline
      </span>
    );
  }
  if (msLeft <= 0) return <span className="text-amber-400">Pickup now</span>;
  const h = Math.floor(msLeft / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  return (
    <span>
      {h}h {m}m remaining
    </span>
  );
}
