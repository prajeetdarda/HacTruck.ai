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
};

export function LoadCard({
  load,
  active,
  assigned,
  offsetHours,
  onClick,
  index,
}: Props) {
  const now = useNow(2000);

  const overdue = useMemo(
    () => isLoadOverdue(load, offsetHours, now),
    [load, offsetHours, now],
  );

  const msLeft = load.pickupDeadline - now - offsetHours * 3600000;
  const urgent = msLeft < 2 * 3600000;

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: "spring", damping: 26 }}
      onClick={onClick}
      disabled={assigned}
      className={clsx(
        "group w-full rounded-xl border p-3 text-left transition-[box-shadow,border-color,background-color] duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
        assigned && "cursor-not-allowed opacity-50",
        active &&
          "border-sky-500/50 bg-sky-500/[0.08] shadow-[0_0_28px_rgba(56,189,248,0.1)]",
        !active &&
          !assigned &&
          (urgent || overdue
            ? "border-amber-500/35 bg-amber-500/[0.06] hover:border-amber-500/55"
            : "border-[var(--border)] bg-[var(--surface-2)]/60 hover:border-zinc-400/80 dark:hover:border-zinc-600/80"),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-[var(--foreground)]">
          {load.id}
        </span>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            overdue && "bg-red-500/20 text-red-400",
            !overdue && urgent && "bg-amber-500/20 text-amber-400",
            !overdue &&
              !urgent &&
              "bg-zinc-200/90 text-zinc-700 dark:bg-zinc-700/80 dark:text-zinc-400",
          )}
        >
          {overdue ? "Overdue" : urgent ? "Urgent" : "Scheduled"}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-[var(--muted)]">
        {load.origin}{" "}
        <span className="text-zinc-500 dark:text-zinc-600">→</span>{" "}
        {load.destination}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-500">
        <span>{formatEquipment(load.equipment)}</span>
        <span className="tabular-nums text-emerald-400/90">
          {formatCurrency(load.revenue)}
        </span>
      </div>
      <div className="mt-2 font-mono text-[10px] text-zinc-600 dark:text-zinc-500">
        Pickup · <Countdown msLeft={msLeft} overdue={overdue} />
      </div>
    </motion.button>
  );
}

function Countdown({ msLeft, overdue }: { msLeft: number; overdue: boolean }) {
  if (overdue) {
    const late = Math.abs(msLeft);
    const h = Math.floor(late / 3600000);
    const m = Math.floor((late % 3600000) / 60000);
    return <span className="text-red-400">{h}h {m}m late</span>;
  }
  if (msLeft <= 0) return <span className="text-amber-400">Now</span>;
  const h = Math.floor(msLeft / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  return (
    <span className="text-zinc-600 dark:text-zinc-400">
      {h}h {m}m
    </span>
  );
}
