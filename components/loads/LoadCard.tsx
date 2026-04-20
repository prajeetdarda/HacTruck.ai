"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useMemo } from "react";
import { useNow } from "@/hooks/useNow";
import type { Load } from "@/lib/types";
import { formatCurrency, formatEquipment } from "@/lib/format";
import { isLoadOverdue } from "@/lib/simulation";

type Props = {
  load: Load;
  active: boolean;
  assigned: boolean;
  offsetHours: number;
  onClick: () => void;
  index: number;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
};

export function LoadCard({
  load,
  active,
  assigned,
  offsetHours,
  onClick,
  index,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  const now = useNow(2000);

  const overdue = useMemo(
    () => isLoadOverdue(load, offsetHours, now),
    [load, offsetHours, now],
  );

  const msLeft = load.pickupDeadline - now - offsetHours * 3600000;
  const urgent = msLeft < 2 * 3600000;
  const hoursLeft = msLeft > 0 ? msLeft / 3600000 : 0;
  const timeBarPct = Math.max(0, Math.min(100, (hoursLeft / 8) * 100));

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: "spring", damping: 26 }}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      disabled={assigned}
      className={clsx(
        "group relative w-full overflow-hidden rounded-xl border p-3 text-left transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
        assigned && "cursor-not-allowed opacity-50",
        /* Left urgency stripe */
        active && "border-l-[3px] border-l-amber-400",
        !active && overdue && "border-l-[3px] border-l-rose-500",
        !active && !overdue && urgent && "border-l-[3px] border-l-amber-500",
        !active && !overdue && !urgent && "border-l-[3px] border-l-slate-700",
        /* Background & border */
        active &&
          "border-amber-500/35 bg-amber-500/[0.07] shadow-[0_0_20px_rgba(245,158,11,0.1)]",
        !active &&
          !assigned &&
          (overdue
            ? "border-rose-500/25 bg-rose-500/[0.04] hover:border-rose-500/40 hover:bg-rose-500/[0.07]"
            : urgent
            ? "border-amber-500/20 bg-amber-500/[0.04] hover:border-amber-500/35 hover:bg-amber-500/[0.07]"
            : "border-[var(--glass-border)] bg-[var(--glass-bg)]/50 hover:border-white/15 hover:bg-white/[0.03]"),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-[var(--foreground)]">
          {load.id}
        </span>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            overdue && "bg-rose-500/20 text-rose-700 dark:text-rose-400",
            !overdue && urgent && "bg-amber-500/20 text-amber-700 dark:text-amber-400",
            !overdue && !urgent && "bg-black/[0.06] dark:bg-white/[0.06] text-slate-600 dark:text-slate-400",
          )}
        >
          {overdue ? "Overdue" : urgent ? "Urgent" : "Scheduled"}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-[var(--muted)]">
        {load.origin}{" "}
        <span className="text-slate-600">→</span>{" "}
        {load.destination}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>{formatEquipment(load.equipment)}</span>
        <span className="tabular-nums font-bold text-green-700 dark:text-green-400">
          {formatCurrency(load.revenue)}
        </span>
      </div>
      {/* Time remaining bar */}
      {!overdue && !assigned && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
            <span>Pickup</span>
            <Countdown msLeft={msLeft} overdue={overdue} />
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-500",
                urgent ? "bg-amber-500" : "bg-green-500/60",
              )}
              style={{ width: `${timeBarPct}%` }}
            />
          </div>
        </div>
      )}
      {overdue && (
        <div className="mt-2 font-mono text-[10px] text-rose-400">
          <Countdown msLeft={msLeft} overdue={overdue} />
        </div>
      )}
    </motion.button>
  );
}

function Countdown({ msLeft, overdue }: { msLeft: number; overdue: boolean }) {
  if (overdue) {
    const late = Math.abs(msLeft);
    const h = Math.floor(late / 3600000);
    const m = Math.floor((late % 3600000) / 60000);
    return <span className="text-rose-400">{h}h {m}m late</span>;
  }
  if (msLeft <= 0) return <span className="text-amber-400">Now</span>;
  const h = Math.floor(msLeft / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  return (
    <span>
      {h}h {m}m
    </span>
  );
}
