"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useMatchLoad } from "@/components/providers/MatchLoadProvider";
import { RING_STATUS_COLOR } from "@/components/icons/MapMarkers";
import {
  FLEET_NAME,
  TERMINAL,
  getActiveTripForDriver,
  getAlertsForDriver,
  getDriver,
  getDriverProfile,
  getLoad,
  getVehicleForDriver,
} from "@/lib/backend-db";
import { formatCpm, formatCurrency, formatEquipment } from "@/lib/format";
import { Z_PANEL } from "@/lib/layout-tokens";
import { shortAiReason } from "@/lib/scoring";
import { getDriverStatusExplanation } from "@/lib/simulation";
import { DRIVER_RING_LABEL, fleetSummaryRing, type DriverRingStatus } from "@/lib/types";
import type { TruckAlert } from "@/lib/types";

/* ─── SVG truck icon (no background, uses currentColor) ─────────── */
function TruckSVG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Trailer */}
      <rect x="2" y="10" width="44" height="22" rx="3" fill="currentColor" opacity="0.75" />
      {/* Cab */}
      <rect x="46" y="6" width="28" height="26" rx="4" fill="currentColor" opacity="0.95" />
      {/* Windshield */}
      <rect x="50" y="10" width="18" height="13" rx="2" fill="currentColor" opacity="0.25" />
      {/* Trailer door lines */}
      <line x1="23" y1="10" x2="23" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Wheels */}
      <circle cx="16" cy="38" r="6" fill="currentColor" opacity="0.9" />
      <circle cx="16" cy="38" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="36" cy="38" r="6" fill="currentColor" opacity="0.9" />
      <circle cx="36" cy="38" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="60" cy="38" r="6" fill="currentColor" opacity="0.9" />
      <circle cx="60" cy="38" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      {/* Step */}
      <rect x="46" y="32" width="8" height="4" rx="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/* ─── Circular HOS gauge ─────────────────────────────────────────── */
function HosGauge({ remaining, maxHours }: { remaining: number; maxHours: number }) {
  const pct = maxHours > 0 ? Math.min(100, (remaining / maxHours) * 100) : 0;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = remaining <= 2 ? "#ef4444" : remaining <= 5 ? "#f59e0b" : "#22c55e";
  const glowColor = remaining <= 2 ? "rgba(239,68,68,0.4)" : remaining <= 5 ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.35)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
      <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r={r} stroke="rgba(128,128,128,0.12)" strokeWidth="7" fill="none" />
        <circle
          cx="40" cy="40" r={r}
          stroke={color}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s ease",
            filter: `drop-shadow(0 0 5px ${glowColor})`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold tabular-nums leading-none" style={{ color }}>
          {remaining.toFixed(0)}h
        </span>
        <span className="text-[8px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>HOS</span>
      </div>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

const RING_BADGE_TAILWIND: Record<DriverRingStatus, string> = {
  urgent: "bg-rose-500/20 text-rose-700 dark:text-rose-300 ring-rose-500/30",
  watch: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  good: "bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/25",
  inactive: "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25",
  en_route: "bg-green-500/20 text-green-700 dark:text-green-300 ring-green-500/30",
  available: "bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/25",
  constrained: "bg-orange-500/20 text-orange-700 dark:text-orange-300 ring-orange-500/30",
  off_duty: "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25",
  unavailable: "bg-slate-600/20 text-slate-500 ring-slate-500/25",
};

const ALERT_TYPE_ICON: Record<string, string> = {
  breakdown: "🔧",
  route_deviation: "🧭",
  hos_risk: "⏱",
  weather_delay: "🌧",
  road_conditions: "🚧",
  incident_delay: "⚠️",
};

function alertTypeIcon(type: string) {
  return ALERT_TYPE_ICON[type] ?? "⚠";
}

/* ─── Compact OPS alert row — expandable ────────────────────────── */
function OpsAlertRow({ alert }: { alert: TruckAlert }) {
  const [expanded, setExpanded] = useState(false);
  const isCritical = alert.severity === "critical";
  const isWarning = alert.severity === "warning";

  const severityColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#94a3b8";
  const bgClass = isCritical
    ? "border-rose-500/30 bg-rose-500/[0.05]"
    : isWarning
    ? "border-amber-500/25 bg-amber-500/[0.04]"
    : "border-[var(--glass-border)] bg-[var(--surface-1)]/40";

  return (
    <li
      className={clsx(
        "overflow-hidden rounded-xl border transition-all",
        bgClass,
        isCritical && "animate-[alert-pulse-border_2.4s_ease-in-out_infinite]",
      )}
    >
      {/* Single-row compact header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none"
      >
        {/* Severity LED */}
        <span
          className="flex size-2 shrink-0 rounded-full"
          style={{ background: severityColor, boxShadow: `0 0 5px ${severityColor}` }}
          aria-hidden
        />
        {/* Type icon + headline */}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="text-[13px]" aria-hidden>{alertTypeIcon(alert.type)}</span>
            <span className="truncate text-[12px] font-semibold text-[var(--foreground)]">
              {alert.headline}
            </span>
          </span>
        </span>
        {/* ETA impact chip */}
        {alert.etaImpactMinutes > 0 && (
          <span
            className="shrink-0 rounded-md px-1.5 py-px text-[10px] font-bold tabular-nums"
            style={{ color: isCritical ? "#f87171" : "#fbbf24", background: isCritical ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.10)" }}
          >
            +{alert.etaImpactMinutes}m
          </span>
        )}
        <ChevronDownIcon className={clsx("size-3.5 shrink-0 text-[var(--muted)] transition-transform", expanded && "rotate-180")} />
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--glass-border)] px-3 py-3 space-y-2.5">
              {/* ETA bar */}
              {alert.etaImpactMinutes > 0 && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">ETA delay</span>
                    <span className={clsx("text-[11px] font-bold tabular-nums", isCritical ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")}>
                      +{alert.etaImpactMinutes} min
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/[0.07]">
                    <div
                      className={clsx("h-full rounded-full", isCritical ? "bg-rose-500" : "bg-amber-500")}
                      style={{ width: `${Math.min(100, (alert.etaImpactMinutes / 120) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="text-[12px] leading-snug text-[var(--muted)]">{alert.detail}</p>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300/80">Action</p>
                <p className="mt-1 text-[12px] font-medium leading-snug text-amber-900 dark:text-amber-100/90">{alert.recommendedAction}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function CollapsibleBlock({
  buttonId, panelId, title, titleClassName, badge, collapsedHint,
  expanded, onToggle, shellClassName, buttonHoverClassName, chevronClassName, children,
}: {
  buttonId: string; panelId: string; title: string; titleClassName: string;
  badge?: ReactNode; collapsedHint?: string; expanded: boolean;
  onToggle: () => void; shellClassName: string; buttonHoverClassName: string;
  chevronClassName?: string; children: ReactNode;
}) {
  return (
    <div className={shellClassName}>
      <button
        type="button"
        id={buttonId}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className={clsx(
          "flex w-full items-start gap-2 rounded-lg py-0.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
          buttonHoverClassName,
        )}
      >
        <span className={clsx("mt-0.5 inline-flex shrink-0 transition-transform", chevronClassName, expanded && "rotate-180")} aria-hidden>
          <ChevronDownIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={titleClassName}>{title}</span>
            {badge}
          </span>
          {!expanded && collapsedHint ? (
            <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{collapsedHint}</span>
          ) : null}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key={panelId}
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function DriverDetailPanel() {
  const { state, selectedLoad, driversSimulated, selectDriver, assign, ranked, bumpMapRingFilterPage } = useDispatchContext();
  const matchLoad = useMatchLoad();

  const ringBrowseDrivers = useMemo(() => {
    if (!state.mapRingFilter) return [];
    return driversSimulated
      .filter((d) => fleetSummaryRing(d.ringStatus) === state.mapRingFilter)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [driversSimulated, state.mapRingFilter]);

  const ringBrowseActive = !selectedLoad && state.mapRingFilter != null;
  const ringBrowseTotal = ringBrowseDrivers.length;

  const driver = useMemo(
    () => driversSimulated.find((d) => d.id === state.selectedDriverId),
    [driversSimulated, state.selectedDriverId],
  );

  const rankedRow = useMemo(
    () => ranked.find((r) => r.driver.id === driver?.id),
    [ranked, driver?.id],
  );

  const hosPct = driver ? Math.min(100, (driver.hosRemainingHours / driver.hosMaxHours) * 100) : 0;

  const profile = useMemo(() => (driver ? getDriverProfile(driver.id) : undefined), [driver]);
  const vehicle = useMemo(() => (driver ? getVehicleForDriver(driver.id) : undefined), [driver]);
  const activeTrip = useMemo(() => (driver ? getActiveTripForDriver(driver.id) : undefined), [driver]);
  const activeLoad = useMemo(() => (activeTrip ? getLoad(activeTrip.loadId) : undefined), [activeTrip]);
  const driverAlerts = useMemo(
    () => (driver ? getAlertsForDriver(driver.id, state.simulatedHoursOffset) : []),
    [driver, state.simulatedHoursOffset],
  );
  const baseDriver = useMemo(() => (driver ? getDriver(driver.id) : undefined), [driver?.id]);
  const statusExplanation = useMemo(
    () => baseDriver && driver ? getDriverStatusExplanation(baseDriver, driver, state.simulatedHoursOffset) : [],
    [baseDriver, driver, state.simulatedHoursOffset],
  );

  const ringColor = driver ? RING_STATUS_COLOR[driver.ringStatus] : "#475569";

  const [opsAlertsExpanded, setOpsAlertsExpanded] = useState(true);
  const [truckInfoExpanded, setTruckInfoExpanded] = useState(false);
  const [activeTripExpanded, setActiveTripExpanded] = useState(false);
  const [loadFitExpanded, setLoadFitExpanded] = useState(true);
  const [llmInsightExpanded, setLlmInsightExpanded] = useState(true);

  useEffect(() => {
    setOpsAlertsExpanded(true);
    setTruckInfoExpanded(false);
    setActiveTripExpanded(false);
    setLoadFitExpanded(true);
    setLlmInsightExpanded(true);
  }, [state.selectedDriverId]);

  const slateRank = useMemo(() => {
    if (!driver || ranked.length === 0) return null;
    const idx = ranked.findIndex((r) => r.driver.id === driver.id);
    return idx >= 0 ? idx + 1 : null;
  }, [ranked, driver]);

  const llmRowForDriver = useMemo(() => {
    if (matchLoad.status !== "ready" || !selectedLoad || matchLoad.loadId !== selectedLoad.id || !matchLoad.result || !driver) return null;
    return matchLoad.result.top3.find((t) => t.driverId === driver.id) ?? null;
  }, [matchLoad, selectedLoad?.id, driver?.id]);

  return (
    <AnimatePresence mode="wait">
      {state.selectedDriverId && driver && (
        <motion.aside
          key={driver.id}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="glass-panel absolute inset-y-0 right-0 flex min-h-0 w-[min(420px,100%)] flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.6)]"
          style={{ zIndex: Z_PANEL, borderRadius: 0, border: "none", borderLeft: "1px solid var(--glass-border)" }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain ops-grid">

              {/* Panel header */}
              <div className="border-b border-[var(--glass-border)] bg-gradient-to-b from-amber-500/[0.06] to-transparent px-4 pb-3 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400/70">
                      {FLEET_NAME}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                      {TERMINAL.name}
                      <span className="mx-1.5 text-[var(--border)]">·</span>
                      <span className="font-mono font-medium text-[var(--foreground)]">DRV-{driver.id}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectDriver(null)}
                    className="shrink-0 rounded-lg p-2 text-[var(--muted)] outline-none transition-colors hover:bg-white/[0.06] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                    aria-label="Close panel"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* ── Driver hero card ─────────────────────────────── */}
              <div className="border-b border-[var(--glass-border)] px-4 py-4">
                <div className="flex items-center gap-4">
                  {/* Avatar with ring color border */}
                  <div
                    className="relative flex size-[72px] shrink-0 items-center justify-center rounded-2xl border-2 bg-gradient-to-b from-white/[0.04] to-transparent font-bold text-2xl text-[var(--foreground)]"
                    style={{ borderColor: ringColor }}
                  >
                    {driver.initials}
                    <span
                      className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[var(--surface-1)]"
                      style={{ background: ringColor }}
                      title={DRIVER_RING_LABEL[driver.ringStatus]}
                    />
                  </div>

                  {/* Name + status */}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold leading-tight text-[var(--foreground)]">{driver.name}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", RING_BADGE_TAILWIND[driver.ringStatus])}>
                        {DRIVER_RING_LABEL[driver.ringStatus]}
                      </span>
                      {driver.currentLoadEndingInHours != null && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          Clear ~{driver.currentLoadEndingInHours.toFixed(1)}h
                        </span>
                      )}
                    </div>
                    {profile && (
                      <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                        <a href={`tel:${profile.phone.replace(/\D/g, "")}`} className="hover:text-amber-400">
                          {profile.phone}
                        </a>
                      </p>
                    )}
                  </div>

                  {/* HOS gauge */}
                  <HosGauge remaining={driver.hosRemainingHours} maxHours={driver.hosMaxHours} />
                </div>

                {/* KPI strip */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)]/60 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Lane</p>
                    <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--foreground)]">{driver.laneFamiliarity}%</p>
                    <p className="text-[9px] text-[var(--muted)]">{driver.laneHistoryCount} loads</p>
                  </div>
                  <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)]/60 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">$/mi</p>
                    <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--foreground)]">{formatCpm(driver.costPerMile)}</p>
                    <p className="text-[9px] text-[var(--muted)]">Cost per mile</p>
                  </div>
                  <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)]/60 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Equip</p>
                    <p className="mt-1 text-[11px] font-bold leading-tight text-[var(--foreground)]">{formatEquipment(driver.equipment)}</p>
                  </div>
                </div>

                {/* Why this status (only show if meaningful) */}
                {statusExplanation.length > 0 && (
                  <div className="mt-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-1)]/40 px-2.5 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">Status reason</p>
                    <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
                      {statusExplanation[0]}
                    </p>
                  </div>
                )}
              </div>

              {/* ── OPS Alerts ──────────────────────────────────── */}
              {driverAlerts.length > 0 && (
                <CollapsibleBlock
                  buttonId="ops-alerts-disclosure"
                  panelId="driver-ops-alerts-panel"
                  title="Ops alerts"
                  titleClassName="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300/90"
                  badge={
                    <span className="rounded-md bg-rose-500/20 px-1.5 py-px text-[10px] font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                      {driverAlerts.length}
                    </span>
                  }
                  collapsedHint={`${driverAlerts.length} alert${driverAlerts.length > 1 ? "s" : ""} — expand to review`}
                  expanded={opsAlertsExpanded}
                  onToggle={() => setOpsAlertsExpanded((v) => !v)}
                  shellClassName="border-b border-[var(--glass-border)] bg-gradient-to-b from-amber-500/[0.04] to-transparent px-4 pb-3 pt-3"
                  buttonHoverClassName="hover:bg-amber-500/[0.06]"
                  chevronClassName="text-amber-700 dark:text-amber-300/80"
                >
                  <ul className="mt-2 space-y-1.5 pb-1">
                    {driverAlerts.map((a) => <OpsAlertRow key={a.alertId} alert={a} />)}
                  </ul>
                </CollapsibleBlock>
              )}

              <div className="space-y-0 px-4 pb-4 pt-3">
                {/* Truck Info */}
                <CollapsibleBlock
                  buttonId="truck-info-disclosure"
                  panelId="truck-info-panel"
                  title="Truck"
                  titleClassName="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400/90"
                  badge={
                    vehicle ? (
                      <span className="rounded-md bg-amber-500/15 px-1.5 py-px font-mono text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                        {vehicle.vehicleNo}
                      </span>
                    ) : null
                  }
                  collapsedHint={vehicle ? `${vehicle.vehicleNo} · ${vehicle.make} ${vehicle.model}` : driver.truckLabel}
                  expanded={truckInfoExpanded}
                  onToggle={() => setTruckInfoExpanded((v) => !v)}
                  shellClassName="mb-4 border-b border-[var(--glass-border)] pb-3"
                  buttonHoverClassName="hover:bg-amber-500/[0.06]"
                  chevronClassName="text-amber-700 dark:text-amber-300"
                >
                  <div className="pt-2">
                    <div className="flex gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)]/70 p-3">
                      {/* SVG truck (no white background) */}
                      <div className="flex size-[88px] shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/[0.06]">
                        <TruckSVG className="size-[64px] text-amber-400/80" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="font-mono text-base font-bold text-[var(--foreground)]">{vehicle?.vehicleNo ?? driver.truckLabel}</p>
                        {vehicle ? (
                          <>
                            <p className="text-[12px] text-[var(--muted)]">{vehicle.make} {vehicle.model}</p>
                            <span className={clsx(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                              vehicle.status === "ACTIVE" ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/25" :
                              vehicle.status === "MAINTENANCE" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30" :
                              "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25",
                            )}>
                              {vehicle.status === "MAINTENANCE" ? "In shop" : vehicle.status === "ACTIVE" ? "Road-ready" : vehicle.status}
                            </span>
                            <p className="text-[11px] text-[var(--muted)]">{formatEquipment(vehicle.equipment)} · {vehicle.grossWeightLbs.toLocaleString()} lb</p>
                          </>
                        ) : (
                          <p className="text-[12px] text-[var(--muted)]">{driver.truckLabel}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleBlock>

                {/* Active Trip */}
                {activeTrip && (
                  <CollapsibleBlock
                    buttonId="active-trip-disclosure"
                    panelId="active-trip-panel"
                    title="Active trip"
                    titleClassName="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-700 dark:text-green-400/90"
                    badge={
                      activeLoad ? (
                        <span className="font-mono text-[10px] font-semibold text-green-700 dark:text-green-300">{activeLoad.id}</span>
                      ) : (
                        <span className="text-[10px] text-green-700 dark:text-green-400">En route</span>
                      )
                    }
                    collapsedHint={activeLoad ? `${activeLoad.origin} → ${activeLoad.destination}` : activeTrip.tripId}
                    expanded={activeTripExpanded}
                    onToggle={() => setActiveTripExpanded((v) => !v)}
                    shellClassName="mb-4 border-b border-[var(--glass-border)] pb-3"
                    buttonHoverClassName="hover:bg-green-500/[0.06]"
                    chevronClassName="text-green-700 dark:text-green-400"
                  >
                    <div className="pt-2">
                      <div className="rounded-2xl border border-green-400/20 bg-green-500/[0.04] p-3">
                        {activeLoad ? (
                          <div>
                            <p className="font-mono text-xs font-semibold text-green-700 dark:text-green-300">{activeLoad.id}</p>
                            <p className="mt-1 text-[13px] font-medium text-[var(--foreground)]">
                              {activeLoad.origin} <span className="text-[var(--muted)]">→</span> {activeLoad.destination}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--muted)]">{formatEquipment(activeLoad.equipment)} · {formatCurrency(activeLoad.revenue)}</p>
                          </div>
                        ) : null}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                          <div><p className="text-[9px] uppercase text-[var(--muted)]">Status</p><p className="mt-0.5 capitalize text-[var(--foreground)]">{activeTrip.status.replace(/_/g, " ")}</p></div>
                          <div><p className="text-[9px] uppercase text-[var(--muted)]">OOR</p><p className="mt-0.5 tabular-nums text-[var(--foreground)]">{activeTrip.oorMiles.toFixed(1)} mi</p></div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleBlock>
                )}

                {/* Load Fit */}
                {selectedLoad ? (
                  <CollapsibleBlock
                    buttonId="load-fit-disclosure"
                    panelId="load-fit-panel"
                    title="Load fit"
                    titleClassName="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]"
                    badge={
                      rankedRow ? (
                        <span className="rounded-md bg-teal-500/15 px-1.5 py-px text-[10px] font-bold tabular-nums text-teal-700 dark:text-teal-300">
                          {Math.min(99, rankedRow.matchPercent + 2)}%
                        </span>
                      ) : null
                    }
                    collapsedHint={selectedLoad ? `${selectedLoad.id} · tap to expand` : undefined}
                    expanded={loadFitExpanded}
                    onToggle={() => setLoadFitExpanded((v) => !v)}
                    shellClassName="mb-4 border-b border-[var(--glass-border)] pb-3"
                    buttonHoverClassName="hover:bg-white/[0.03]"
                    chevronClassName="text-[var(--muted)]"
                  >
                    <div className="pt-2">
                      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)]/60 p-3">
                        <div className="flex items-end justify-between">
                          <p className="text-3xl font-extrabold tabular-nums text-[var(--foreground)]">
                            {rankedRow ? `${Math.min(99, rankedRow.matchPercent + 2)}%` : "—"}
                          </p>
                          <p className="text-[11px] text-[var(--muted)]">match score</p>
                        </div>
                        {rankedRow && rankedRow.reasons.length > 0 ? (
                          <ul className="mt-2.5 space-y-1 text-[12px] text-[var(--muted)]">
                            {rankedRow.reasons.map((x, i) => (
                              <li key={`${i}-${x}`} className="flex gap-2">
                                <span className="text-teal-600 dark:text-teal-400">✓</span>
                                <span>{x}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </CollapsibleBlock>
                ) : null}

                {/* Dispatcher Model */}
                {selectedLoad && rankedRow ? (
                  <CollapsibleBlock
                    buttonId="llm-match-disclosure"
                    panelId="llm-match-panel"
                    title="Dispatcher AI"
                    titleClassName="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300/90"
                    badge={
                      slateRank != null ? (
                        <span className="rounded-md bg-indigo-500/15 px-1.5 py-px text-[10px] font-semibold tabular-nums text-indigo-800 dark:text-indigo-200">
                          #{slateRank}
                        </span>
                      ) : null
                    }
                    collapsedHint="AI reasoning for selected load"
                    expanded={llmInsightExpanded}
                    onToggle={() => setLlmInsightExpanded((v) => !v)}
                    shellClassName="mb-2 border-b border-[var(--glass-border)] bg-gradient-to-b from-indigo-500/[0.04] to-transparent pb-3"
                    buttonHoverClassName="hover:bg-indigo-500/[0.07]"
                    chevronClassName="text-indigo-700 dark:text-indigo-300"
                  >
                    <div className="pt-2">
                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-3">
                        {state.loadSelectSource !== "inbox" ? (
                          <p className="text-[12px] leading-snug text-[var(--muted)]">
                            {shortAiReason(rankedRow, slateRank ?? 1)}
                          </p>
                        ) : matchLoad.status === "loading" && matchLoad.loadId === selectedLoad.id ? (
                          <p className="text-[12px] text-[var(--muted)]">Running analysis…</p>
                        ) : matchLoad.status === "ready" && matchLoad.loadId === selectedLoad.id && matchLoad.result ? (
                          <>
                            {llmRowForDriver ? (
                              <p className="text-[12px] font-medium leading-snug text-[var(--foreground)]">{llmRowForDriver.reasoning}</p>
                            ) : (
                              <p className="text-[12px] leading-snug text-[var(--muted)]">{shortAiReason(rankedRow, slateRank ?? 1)}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-[12px] text-[var(--muted)]">Match insight pending.</p>
                        )}
                      </div>
                    </div>
                  </CollapsibleBlock>
                ) : null}
              </div>
            </div>

            {/* Ring browse controls */}
            {ringBrowseActive && ringBrowseTotal > 0 ? (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--glass-border)] px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => bumpMapRingFilterPage(-1)}
                  disabled={state.mapRingFilterPage <= 0}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--surface-1)] text-lg font-semibold text-[var(--muted)] outline-none transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                >‹</button>
                <p className="text-center text-[11px] tabular-nums text-[var(--muted)]">
                  {state.mapRingFilterPage + 1} / {ringBrowseTotal}
                </p>
                <button
                  type="button"
                  onClick={() => bumpMapRingFilterPage(1)}
                  disabled={state.mapRingFilterPage >= ringBrowseTotal - 1}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--surface-1)] text-lg font-semibold text-[var(--muted)] outline-none transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                >›</button>
              </div>
            ) : null}

            {/* Assign button */}
            {selectedLoad ? (
              <div className="shrink-0 border-t border-[var(--glass-border)] p-4">
                <button
                  type="button"
                  onClick={() =>
                    assign(selectedLoad.id, driver.id, driver.name, {
                      matchPercent: rankedRow ? Math.min(99, rankedRow.matchPercent + 2) : undefined,
                    })
                  }
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all hover:shadow-[0_0_28px_rgba(245,158,11,0.4)] hover:from-amber-400 hover:to-orange-400"
                >
                  Assign to {selectedLoad.id}
                </button>
              </div>
            ) : null}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
