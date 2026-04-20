"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useNow } from "@/hooks/useNow";
import { getLoadRecommendations } from "@/lib/backend-db";
import { formatCpm, formatCurrency, formatEquipment } from "@/lib/format";
import { Z_PANEL } from "@/lib/layout-tokens";
import { isLoadOverdue } from "@/lib/simulation";

/* ─── Urgency countdown ring ─────────────────────────────────────── */
function UrgencyRing({ msLeft, overdue }: { msLeft: number; overdue: boolean }) {
  const WINDOW_MS = 4 * 3_600_000; // 4-hour window
  const pct = overdue ? 0 : Math.min(100, Math.max(0, (msLeft / WINDOW_MS) * 100));
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const isRed = overdue || (!overdue && msLeft < 1 * 3_600_000);
  const isAmber = !isRed && msLeft < 2 * 3_600_000;
  const color = isRed ? "#ef4444" : isAmber ? "#f59e0b" : "#22c55e";
  const glowColor = isRed ? "rgba(239,68,68,0.45)" : isAmber ? "rgba(245,158,11,0.45)" : "rgba(34,197,94,0.4)";

  const absMs = Math.abs(msLeft);
  const h = Math.floor(absMs / 3_600_000);
  const m = Math.floor((absMs % 3_600_000) / 60_000);

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: 88, height: 88 }}>
      <svg width="88" height="88" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="44" cy="44" r={r} stroke="rgba(128,128,128,0.10)" strokeWidth="7" fill="none" />
        <circle
          cx="44" cy="44" r={r}
          stroke={color}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold tabular-nums leading-none" style={{ color }}>
          {h}h
        </span>
        <span className="text-[9px] font-semibold" style={{ color: "var(--muted)" }}>
          {m}m {overdue ? "late" : "left"}
        </span>
      </div>
    </div>
  );
}

/* ─── Compact driver candidate chip ─────────────────────────────── */
function CandidateChip({
  rank,
  name,
  matchPercent,
  distanceMiles,
  rejectTags,
  onAssign,
}: {
  rank: number;
  name: string;
  matchPercent: number;
  distanceMiles: number;
  rejectTags: string[];
  onAssign?: () => void;
}) {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const isRejected = rejectTags.length > 0;
  const rankColor = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : "#6b7280";

  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 rounded-xl border p-2.5 transition-all",
        isRejected
          ? "border-rose-500/20 bg-rose-500/[0.04] opacity-60"
          : rank === 1
          ? "border-amber-500/35 bg-amber-500/[0.07]"
          : "border-[var(--glass-border)] bg-[var(--surface-1)]/60",
      )}
    >
      {/* Rank badge */}
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold"
        style={{
          background: rank <= 3 ? `${rankColor}20` : "rgba(100,116,139,0.1)",
          color: rankColor,
          border: `1px solid ${rankColor}40`,
        }}
      >
        {rank}
      </span>

      {/* Avatar */}
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white"
        style={{
          background: isRejected
            ? "rgba(100,116,139,0.4)"
            : rank === 1
            ? "linear-gradient(135deg, #f59e0b, #ea580c)"
            : "rgba(100,116,139,0.3)",
        }}
      >
        {initials}
      </span>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[var(--foreground)]">{name}</p>
        <p className="text-[10px] text-[var(--muted)]">
          {isRejected ? (
            <span className="text-rose-400">{rejectTags[0]!.replace(/_/g, " ")}</span>
          ) : (
            <>{Math.round(distanceMiles)} mi away</>
          )}
        </p>
      </div>

      {/* Match % + assign */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={clsx("text-[11px] font-bold tabular-nums", isRejected ? "text-rose-400" : rank === 1 ? "text-amber-400" : "text-green-400")}>
          {matchPercent}%
        </span>
        {!isRejected && onAssign && (
          <button
            type="button"
            onClick={onAssign}
            className={clsx(
              "rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-all",
              rank === 1
                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-amber-300",
            )}
          >
            Assign
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadDetailPanel() {
  const { state, selectedLoad, selectLoad, assign } = useDispatchContext();
  const now = useNow(2000);

  const overdue = useMemo(
    () => selectedLoad ? isLoadOverdue(selectedLoad, state.simulatedHoursOffset, now) : false,
    [selectedLoad, state.simulatedHoursOffset, now],
  );

  const msLeft = selectedLoad
    ? selectedLoad.pickupDeadline - now - state.simulatedHoursOffset * 3_600_000
    : 0;
  const urgent = msLeft < 2 * 3_600_000 && !overdue;

  const recommendation = useMemo(
    () => (selectedLoad ? getLoadRecommendations(selectedLoad.id) : null),
    [selectedLoad],
  );

  const candidates = recommendation?.comparison.slice(0, 5) ?? [];

  return (
    <AnimatePresence mode="wait">
      {selectedLoad && !state.selectedDriverId && (
        <motion.aside
          key={selectedLoad.id}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="glass-panel absolute inset-y-0 right-0 flex w-[min(360px,100%)] flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.6)]"
          style={{ zIndex: Z_PANEL, borderRadius: 0, border: "none", borderLeft: "1px solid var(--glass-border)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[var(--glass-border)] bg-gradient-to-b from-amber-500/[0.05] to-transparent px-4 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/70">Load</p>
              <h2 className="mt-0.5 font-mono text-xl font-bold text-[var(--foreground)]">{selectedLoad.id}</h2>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                {selectedLoad.origin} <span className="text-[var(--muted)]">→</span> {selectedLoad.destination}
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectLoad(null)}
              className="rounded-lg p-2 text-[var(--muted)] outline-none transition-colors hover:bg-white/[0.06] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              aria-label="Close panel"
            >✕</button>
          </div>

          <div className="flex-1 overflow-y-auto ops-grid">
            {/* Urgency hero row */}
            <div className="flex items-center gap-4 border-b border-[var(--glass-border)] px-4 py-4">
              <UrgencyRing msLeft={msLeft} overdue={overdue} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                      overdue ? "bg-rose-500/20 text-rose-400" : urgent ? "bg-amber-500/20 text-amber-400" : "bg-white/[0.06] text-[var(--muted)]",
                    )}
                  >
                    {overdue ? "Overdue" : urgent ? "Urgent" : "Scheduled"}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)]/60 p-2.5">
                    <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">Revenue</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums text-green-400">{formatCurrency(selectedLoad.revenue)}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)]/60 p-2.5">
                    <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">Equipment</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[var(--foreground)]">{formatEquipment(selectedLoad.equipment)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top candidates */}
            {candidates.length > 0 && (
              <div className="px-4 py-4">
                <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Top candidates
                </h3>
                <div className="space-y-2">
                  {candidates.map((row) => (
                    <CandidateChip
                      key={row.driverId}
                      rank={candidates.indexOf(row) + 1}
                      name={row.driverName}
                      matchPercent={row.matchPercent}
                      distanceMiles={row.distanceMiles}
                      rejectTags={row.rejectTags}
                      onAssign={
                        row.rejectTags.length === 0
                          ? () => assign(selectedLoad.id, row.driverId, row.driverName, { matchPercent: row.matchPercent })
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
