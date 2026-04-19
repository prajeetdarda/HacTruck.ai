"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useMatchLoad } from "@/components/providers/MatchLoadProvider";
import { RING_STATUS_COLOR, TRUCK_MARKER_IMAGE_SRC } from "@/components/icons/MapMarkers";
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
import { formatCpm, formatCurrency, formatDateTimeLocal, formatEquipment } from "@/lib/format";
import { Z_PANEL } from "@/lib/layout-tokens";
import { shortAiReason } from "@/lib/scoring";
import { getDriverStatusExplanation } from "@/lib/simulation";
import { DRIVER_RING_LABEL, fleetSummaryRing, type DriverRingStatus } from "@/lib/types";
import type { TruckAlert } from "@/lib/types";

function HeroPersonGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="32" cy="22" r="12" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M14 54c0-10 8-18 18-18s18 8 18 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

function HeroTruckGlyph({ className }: { className?: string }) {
  return (
    <img
      src={TRUCK_MARKER_IMAGE_SRC}
      alt=""
      className={clsx(
        "bg-transparent object-contain mix-blend-multiply select-none",
        className,
      )}
      draggable={false}
    />
  );
}

const RING_BADGE_TAILWIND: Record<DriverRingStatus, string> = {
  urgent: "bg-rose-500/20 text-rose-900 ring-rose-500/35 dark:text-rose-100",
  watch: "bg-amber-500/15 text-amber-900 ring-amber-500/30 dark:text-amber-200",
  good: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-200",
  inactive: "bg-zinc-500/15 text-zinc-700 ring-zinc-500/30 dark:text-zinc-300",
  en_route: "bg-sky-500/20 text-sky-900 ring-sky-500/35 dark:text-sky-100",
  available: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-200",
  constrained: "bg-orange-500/20 text-orange-900 ring-orange-500/35 dark:text-orange-100",
  off_duty: "bg-zinc-500/15 text-zinc-700 ring-zinc-500/30 dark:text-zinc-300",
  unavailable: "bg-zinc-600/25 text-zinc-800 ring-zinc-500/30 dark:text-zinc-300",
};

const WORK_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Available for dispatch",
  ON_LOAD: "On active load",
  INACTIVE: "Inactive / resting",
};

const ENDORSEMENT_HINT: Record<string, string> = {
  H: "Hazmat",
  N: "Tank",
  T: "Doubles / triples",
  X: "Tank + hazmat",
  P: "Passenger",
  S: "School bus",
};

const ALERT_TYPE_LABEL: Record<string, string> = {
  breakdown: "Equipment / breakdown",
  route_deviation: "Route deviation",
  hos_risk: "HOS & compliance",
  weather_delay: "Weather / conditions",
  road_conditions: "Road / lane conditions",
  incident_delay: "Incident / queue delay",
};

function alertTypeLabel(type: string) {
  return ALERT_TYPE_LABEL[type] ?? type.replace(/_/g, " ");
}

function DetailLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
      {children}
    </span>
  );
}

function CollapsibleBlock({
  buttonId,
  panelId,
  title,
  titleClassName,
  badge,
  collapsedHint,
  expanded,
  onToggle,
  shellClassName,
  buttonHoverClassName,
  chevronClassName,
  children,
}: {
  buttonId: string;
  panelId: string;
  title: string;
  titleClassName: string;
  badge?: React.ReactNode;
  collapsedHint?: string;
  expanded: boolean;
  onToggle: () => void;
  shellClassName: string;
  buttonHoverClassName: string;
  chevronClassName?: string;
  children: React.ReactNode;
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
        <span
          className={clsx(
            "mt-0.5 inline-flex shrink-0 transition-transform",
            chevronClassName,
            expanded && "rotate-180",
          )}
          aria-hidden
        >
          <ChevronDownIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={titleClassName}>{title}</span>
            {badge}
          </span>
          {!expanded && collapsedHint ? (
            <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-500">
              {collapsedHint}
            </span>
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

function OpsAlertCard({ alert }: { alert: TruckAlert }) {
  const severityBorder =
    alert.severity === "critical"
      ? "border-l-rose-500"
      : alert.severity === "warning"
        ? "border-l-amber-400"
        : "border-l-sky-400";

  const severityBadge =
    alert.severity === "critical"
      ? "bg-rose-500/20 text-rose-900 ring-rose-500/40 dark:text-rose-100"
      : alert.severity === "warning"
        ? "bg-amber-500/15 text-amber-900 ring-amber-500/35 dark:text-amber-200"
        : "bg-sky-500/15 text-sky-900 ring-sky-500/30 dark:text-sky-100";

  return (
    <li
      className={clsx(
        "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-sm",
        "border-l-4",
        severityBorder,
      )}
    >
      <div className="border-b border-[var(--border)] bg-black/[0.02] px-3 py-2.5 dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
              severityBadge,
            )}
          >
            {alert.severity}
          </span>
          <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-[var(--border)] dark:text-zinc-300">
            {alertTypeLabel(alert.type)}
          </span>
          {alert.acknowledged ? (
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-500/30 dark:text-emerald-200">
              Acknowledged
            </span>
          ) : (
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-200">
              Needs review
            </span>
          )}
        </div>
        <p className="mt-2 text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)]">
          {alert.headline}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-zinc-500">
          <span>
            <span className="text-[var(--muted)]">Alert</span> {alert.alertId}
          </span>
          <span>
            <span className="text-[var(--muted)]">Trip</span> {alert.tripId}
          </span>
          <span>
            <span className="text-[var(--muted)]">Load</span> {alert.loadId}
          </span>
          <span>
            <span className="text-[var(--muted)]">Truck</span> {alert.vehicleNo}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3 text-sm leading-relaxed">
        <div>
          <DetailLabel>What we&apos;re seeing</DetailLabel>
          <p className="mt-1 text-zinc-700 dark:text-zinc-300">{alert.detail}</p>
        </div>

        <div className="rounded-lg bg-black/[0.03] px-2.5 py-2 dark:bg-white/[0.04]">
          <DetailLabel>Why it matters</DetailLabel>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-[13px] text-zinc-600 dark:text-zinc-400">
            {alert.etaImpactMinutes > 0 ? (
              <li>
                Schedule impact: about <strong className="text-zinc-800 dark:text-zinc-200">{alert.etaImpactMinutes} min</strong>{" "}
                added to ETA if unaddressed.
              </li>
            ) : (
              <li>No direct ETA slip flagged yet; still review if conditions worsen.</li>
            )}
            <li>
              Last known position:{" "}
              <span className="tabular-nums">
                {alert.lastLat.toFixed(4)}°, {alert.lastLng.toFixed(4)}°
              </span>
            </li>
          </ul>
        </div>

        <div>
          <DetailLabel>Recommended next step</DetailLabel>
          <p className="mt-1 font-medium text-sky-900/90 dark:text-sky-200/95">
            {alert.recommendedAction}
          </p>
        </div>

        <p className="border-t border-[var(--border)] pt-2 text-[11px] text-zinc-500">
          Detected {formatDateTimeLocal(alert.detectedAt)}
        </p>
      </div>
    </li>
  );
}

export function DriverDetailPanel() {
  const {
    state,
    selectedLoad,
    driversSimulated,
    selectDriver,
    assign,
    ranked,
    bumpMapRingFilterPage,
  } = useDispatchContext();
  const matchLoad = useMatchLoad();

  const ringBrowseDrivers = useMemo(() => {
    if (!state.mapRingFilter) return [];
    return driversSimulated
      .filter(
        (d) => fleetSummaryRing(d.ringStatus) === state.mapRingFilter,
      )
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

  const hosPct = driver
    ? Math.min(100, (driver.hosRemainingHours / driver.hosMaxHours) * 100)
    : 0;

  const profile = useMemo(
    () => (driver ? getDriverProfile(driver.id) : undefined),
    [driver],
  );
  const vehicle = useMemo(
    () => (driver ? getVehicleForDriver(driver.id) : undefined),
    [driver],
  );
  const activeTrip = useMemo(
    () => (driver ? getActiveTripForDriver(driver.id) : undefined),
    [driver],
  );

  const activeLoad = useMemo(
    () => (activeTrip ? getLoad(activeTrip.loadId) : undefined),
    [activeTrip],
  );

  const driverAlerts = useMemo(
    () =>
      driver ? getAlertsForDriver(driver.id, state.simulatedHoursOffset) : [],
    [driver, state.simulatedHoursOffset],
  );

  const baseDriver = useMemo(
    () => (driver ? getDriver(driver.id) : undefined),
    [driver?.id],
  );

  const statusExplanation = useMemo(
    () =>
      baseDriver && driver
        ? getDriverStatusExplanation(baseDriver, driver, state.simulatedHoursOffset)
        : [],
    [baseDriver, driver, state.simulatedHoursOffset],
  );

  const ringColor = driver ? RING_STATUS_COLOR[driver.ringStatus] : "#71717a";

  const [opsAlertsExpanded, setOpsAlertsExpanded] = useState(true);
  const [driverInfoExpanded, setDriverInfoExpanded] = useState(true);
  const [truckInfoExpanded, setTruckInfoExpanded] = useState(true);
  const [activeTripExpanded, setActiveTripExpanded] = useState(true);
  const [loadFitExpanded, setLoadFitExpanded] = useState(true);
  const [llmInsightExpanded, setLlmInsightExpanded] = useState(true);

  useEffect(() => {
    setOpsAlertsExpanded(true);
    setDriverInfoExpanded(true);
    setTruckInfoExpanded(true);
    setActiveTripExpanded(true);
    setLoadFitExpanded(true);
    setLlmInsightExpanded(true);
  }, [state.selectedDriverId]);

  const slateRank = useMemo(() => {
    if (!driver || ranked.length === 0) return null;
    const idx = ranked.findIndex((r) => r.driver.id === driver.id);
    return idx >= 0 ? idx + 1 : null;
  }, [ranked, driver]);

  const llmRowForDriver = useMemo(() => {
    if (
      matchLoad.status !== "ready" ||
      !selectedLoad ||
      matchLoad.loadId !== selectedLoad.id ||
      !matchLoad.result ||
      !driver
    ) {
      return null;
    }
    return matchLoad.result.top3.find((t) => t.driverId === driver.id) ?? null;
  }, [matchLoad, selectedLoad?.id, driver?.id]);

  const hosAccent =
    driver && driver.hosRemainingHours < 3
      ? "warn"
      : driver && driver.hosRemainingHours >= 7
        ? "good"
        : "default";

  const hosTileClass =
    hosAccent === "warn"
      ? "border-amber-500/30 bg-amber-500/[0.07]"
      : hosAccent === "good"
        ? "border-emerald-500/25 bg-emerald-500/[0.06]"
        : "border-[var(--border)] bg-[var(--surface-1)]/90";

  return (
    <AnimatePresence mode="wait">
      {state.selectedDriverId && driver && (
        <motion.aside
          key={driver.id}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="absolute inset-y-0 right-0 flex min-h-0 w-[min(440px,100%)] flex-col border-l border-[var(--border)] bg-[var(--surface-2)]/98 shadow-[-16px_0_48px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[-16px_0_48px_rgba(0,0,0,0.4)]"
          style={{ zIndex: Z_PANEL }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="border-b border-[var(--border)] bg-gradient-to-b from-sky-500/[0.06] to-transparent px-4 pb-3 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      {FLEET_NAME}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {TERMINAL.name}
                      <span className="mx-1.5 text-zinc-400 dark:text-zinc-600">·</span>
                      <span className="font-mono font-medium text-zinc-600 dark:text-zinc-300">
                        DRV-{driver.id}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectDriver(null)}
                    className="shrink-0 rounded-lg p-2 text-zinc-600 outline-none transition-colors hover:bg-black/[0.04] hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
                    aria-label="Close panel"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {driverAlerts.length > 0 && (
                <CollapsibleBlock
                  buttonId="ops-alerts-disclosure"
                  panelId="driver-ops-alerts-panel"
                  title="Ops alerts"
                  titleClassName="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900/90 dark:text-amber-200/90"
                  badge={
                    <span className="rounded-md bg-amber-500/20 px-1.5 py-px text-[10px] font-semibold tabular-nums text-amber-950 dark:bg-amber-500/15 dark:text-amber-100">
                      {driverAlerts.length}
                    </span>
                  }
                  collapsedHint={
                    driverAlerts.length === 1
                      ? "1 active alert — expand to review"
                      : `${driverAlerts.length} active alerts — expand to review`
                  }
                  expanded={opsAlertsExpanded}
                  onToggle={() => setOpsAlertsExpanded((v) => !v)}
                  shellClassName="border-b border-[var(--border)] bg-gradient-to-b from-amber-500/[0.06] to-transparent px-4 pb-2 pt-2 dark:from-amber-950/25"
                  buttonHoverClassName="hover:bg-amber-500/[0.07] dark:hover:bg-amber-950/40"
                  chevronClassName="text-amber-800/90 dark:text-amber-200/90"
                >
                  <p className="mt-1 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
                    Active for this driver and truck — review before dispatch.
                  </p>
                  <ul className="mt-2 space-y-2 pb-1">
                    {driverAlerts.map((a) => (
                      <OpsAlertCard key={a.alertId} alert={a} />
                    ))}
                  </ul>
                </CollapsibleBlock>
              )}

              <div className="space-y-0 px-4 pb-4 pt-3">
              <CollapsibleBlock
                buttonId="driver-info-disclosure"
                panelId="driver-info-panel"
                title="Driver"
                titleClassName="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600/90 dark:text-sky-400/90"
                badge={
                  <span className="rounded-md bg-sky-500/15 px-1.5 py-px font-mono text-[10px] font-semibold text-sky-900 dark:text-sky-100">
                    {driver.initials}
                  </span>
                }
                collapsedHint={`${driver.name} · profile & HOS`}
                expanded={driverInfoExpanded}
                onToggle={() => setDriverInfoExpanded((v) => !v)}
                shellClassName="mb-4 border-b border-[var(--border)] bg-gradient-to-b from-sky-500/[0.06] to-transparent pb-3"
                buttonHoverClassName="hover:bg-sky-500/[0.08]"
                chevronClassName="text-sky-700 dark:text-sky-400"
              >
                <div className="space-y-3 pt-1">
                  <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-3 shadow-sm dark:bg-zinc-900/35">
                    <div className="flex gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="relative flex size-[92px] flex-col items-center justify-center rounded-2xl border-2 bg-gradient-to-b from-white/40 to-transparent dark:from-white/[0.07]"
                      style={{ borderColor: ringColor }}
                    >
                      <HeroPersonGlyph className="size-[56px] text-[var(--foreground)] opacity-90" />
                      <span className="absolute bottom-1.5 rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-sm">
                        {driver.initials}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div>
                      <h2 className="text-lg font-semibold leading-tight text-[var(--foreground)]">
                        {driver.name}
                      </h2>
                      {profile ? (
                        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                          Home base · {profile.homeCity}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                          RING_BADGE_TAILWIND[driver.ringStatus],
                        )}
                      >
                        {DRIVER_RING_LABEL[driver.ringStatus]}
                      </span>
                      {profile ? (
                        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-zinc-700 ring-1 ring-[var(--border)] dark:text-zinc-300">
                          {WORK_STATUS_LABEL[profile.workStatus] ?? profile.workStatus}
                        </span>
                      ) : null}
                      {driver.currentLoadEndingInHours != null && (
                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:text-sky-200">
                          Clear ~{driver.currentLoadEndingInHours.toFixed(1)}h
                        </span>
                      )}
                    </div>
                    {statusExplanation.length > 0 ? (
                      <div className="rounded-lg border border-[var(--border)] bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.03]">
                        <DetailLabel>Why this status</DetailLabel>
                        <ul className="mt-1.5 list-inside list-disc space-y-1 text-[12px] leading-snug text-zinc-600 dark:text-zinc-400">
                          {statusExplanation.map((line, i) => (
                            <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {profile ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <DetailLabel>Phone</DetailLabel>
                          <a
                            href={`tel:${profile.phone.replace(/\D/g, "")}`}
                            className="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                          >
                            {profile.phone}
                          </a>
                        </div>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <DetailLabel>Email</DetailLabel>
                          <a
                            href={`mailto:${profile.email}`}
                            className="max-w-[min(200px,55vw)] truncate text-right font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                          >
                            {profile.email}
                          </a>
                        </div>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <DetailLabel>Terminal</DetailLabel>
                          <span className="text-right text-[13px] text-zinc-800 dark:text-zinc-200">
                            {profile.terminalId === TERMINAL.id
                              ? TERMINAL.name
                              : `Terminal #${profile.terminalId}`}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <DetailLabel>HOS ({driver.hosMaxHours}h cycle)</DetailLabel>
                        <span className="text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                          {driver.hosRemainingHours.toFixed(1)}h left
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${hosPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div>
                        <DetailLabel>Lane familiarity</DetailLabel>
                        <p className="mt-0.5 font-semibold tabular-nums text-[var(--foreground)]">
                          {driver.laneFamiliarity}%
                        </p>
                        <p className="text-[11px] text-zinc-500">{driver.laneHistoryCount} loads</p>
                      </div>
                      <div>
                        <DetailLabel>Cost / mi</DetailLabel>
                        <p className="mt-0.5 font-semibold tabular-nums text-[var(--foreground)]">
                          {formatCpm(driver.costPerMile)}
                        </p>
                        <p className="text-[11px] text-zinc-500">Benchmark</p>
                      </div>
                      <div className="col-span-2">
                        <DetailLabel>Equipment</DetailLabel>
                        <p className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
                          {formatEquipment(driver.equipment)}
                        </p>
                      </div>
                    </div>

                    {profile ? (
                      <div className="rounded-xl border border-[var(--border)] bg-black/[0.02] p-2.5 dark:bg-white/[0.03]">
                        <DetailLabel>CDL</DetailLabel>
                        <p className="mt-1 text-[13px] text-zinc-800 dark:text-zinc-200">
                          Class {profile.licenseType} · {profile.licenseState} · exp{" "}
                          {profile.licenseExpiration}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {profile.endorsements.length > 0 ? (
                            profile.endorsements.map((code) => (
                              <span
                                key={code}
                                title={ENDORSEMENT_HINT[code]}
                                className="rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-900 dark:text-emerald-200"
                              >
                                {code}
                                {ENDORSEMENT_HINT[code] ? (
                                  <span className="ml-0.5 font-normal opacity-80">
                                    {ENDORSEMENT_HINT[code]}
                                  </span>
                                ) : null}
                              </span>
                            ))
                          ) : (
                            <span className="text-[12px] text-zinc-500">No endorsements</span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] text-zinc-500">
                          Restrictions:{" "}
                          {profile.restrictions.length > 0
                            ? profile.restrictions.join(", ")
                            : "None"}
                        </p>
                      </div>
                    ) : null}

                    {driver.hasActiveConflict ? (
                      <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-2.5 py-2 text-[12px] font-medium text-rose-900 dark:text-rose-100">
                        Scheduling conflict — verify before assigning another load.
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* Quick KPI strip */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={clsx(
                    "rounded-xl border p-2.5 shadow-sm",
                    hosTileClass,
                  )}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    HOS left
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)]">
                    {driver.hosMaxHours > 0 ? `${driver.hosRemainingHours.toFixed(1)}h` : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/90 p-2.5 shadow-sm">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Lane
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)]">
                    {driver.laneFamiliarity}%
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/90 p-2.5 shadow-sm">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    $/mi
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)]">
                    {formatCpm(driver.costPerMile)}
                  </p>
                </div>
              </div>
                </div>
              </CollapsibleBlock>

              <CollapsibleBlock
                buttonId="truck-info-disclosure"
                panelId="truck-info-panel"
                title="Truck"
                titleClassName="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700/90 dark:text-amber-400/90"
                badge={
                  vehicle ? (
                    <span className="rounded-md bg-amber-500/15 px-1.5 py-px font-mono text-[10px] font-semibold text-amber-950 dark:text-amber-100">
                      {vehicle.vehicleNo}
                    </span>
                  ) : null
                }
                collapsedHint={
                  vehicle
                    ? `${vehicle.vehicleNo} · ${vehicle.make} ${vehicle.model}`
                    : driver.truckLabel
                }
                expanded={truckInfoExpanded}
                onToggle={() => setTruckInfoExpanded((v) => !v)}
                shellClassName="mb-4 border-b border-[var(--border)] bg-gradient-to-b from-amber-500/[0.05] to-transparent pb-3 dark:from-amber-950/15"
                buttonHoverClassName="hover:bg-amber-500/[0.07] dark:hover:bg-amber-950/30"
                chevronClassName="text-amber-800 dark:text-amber-300"
              >
                <div className="pt-1">
                  <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-3 shadow-sm dark:bg-zinc-900/35">
                    <div className="flex gap-3">
                  <div className="flex size-[100px] shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-transparent dark:from-amber-500/10">
                    <HeroTruckGlyph className="size-[68px]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-mono text-base font-semibold tracking-tight text-[var(--foreground)]">
                        {vehicle?.vehicleNo ?? "—"}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {vehicle
                          ? `${vehicle.make} ${vehicle.model}`
                          : driver.truckLabel.split("·")[0]?.trim() ?? driver.truckLabel}
                      </p>
                      {vehicle ? (
                        <span
                          className={clsx(
                            "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
                            vehicle.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-200"
                              : vehicle.status === "MAINTENANCE"
                                ? "bg-amber-500/15 text-amber-900 ring-amber-500/35 dark:text-amber-200"
                                : "bg-zinc-500/15 text-zinc-600 ring-zinc-500/30 dark:text-zinc-400",
                          )}
                        >
                          {vehicle.status === "MAINTENANCE"
                            ? "In shop"
                            : vehicle.status === "ACTIVE"
                              ? "Road-ready"
                              : vehicle.status}
                        </span>
                      ) : null}
                    </div>
                    {vehicle ? (
                      <dl className="space-y-1.5 text-[13px]">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--muted)]">Asset ID</dt>
                          <dd className="font-mono font-medium">{vehicle.vehicleId}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--muted)]">VIN</dt>
                          <dd className="max-w-[180px] break-all text-right font-mono text-[11px]">
                            {vehicle.vin}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--muted)]">GVWR</dt>
                          <dd className="tabular-nums">{vehicle.grossWeightLbs.toLocaleString()} lb</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--muted)]">Body</dt>
                          <dd>{formatEquipment(vehicle.equipment)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--muted)]">Class</dt>
                          <dd className="capitalize">{vehicle.type}</dd>
                        </div>
                        <div className="border-t border-[var(--border)] pt-1.5">
                          <span className="text-[10px] text-[var(--muted)]">Dispatcher label</span>
                          <p className="text-[13px] text-zinc-800 dark:text-zinc-200">{driver.truckLabel}</p>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{driver.truckLabel}</p>
                    )}
                  </div>
                </div>
                  </section>
                </div>
              </CollapsibleBlock>

              {activeTrip && (
                <CollapsibleBlock
                  buttonId="active-trip-disclosure"
                  panelId="active-trip-panel"
                  title="Active trip"
                  titleClassName="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 dark:text-sky-300/90"
                  badge={
                    activeLoad ? (
                      <span className="font-mono text-[10px] font-semibold text-sky-800 dark:text-sky-200">
                        {activeLoad.id}
                      </span>
                    ) : (
                      <span className="text-[10px] text-sky-700 dark:text-sky-300">
                        En route
                      </span>
                    )
                  }
                  collapsedHint={
                    activeLoad
                      ? `${activeLoad.origin} → ${activeLoad.destination}`
                      : activeTrip.tripId
                  }
                  expanded={activeTripExpanded}
                  onToggle={() => setActiveTripExpanded((v) => !v)}
                  shellClassName="mb-4 border-b border-[var(--border)] bg-gradient-to-b from-sky-400/[0.07] to-transparent pb-3 dark:border-sky-900/40"
                  buttonHoverClassName="hover:bg-sky-500/10 dark:hover:bg-sky-950/40"
                  chevronClassName="text-sky-800 dark:text-sky-300"
                >
                  <div className="pt-1">
                    <section className="rounded-2xl border border-sky-400/25 bg-sky-500/[0.06] p-3 dark:bg-sky-950/20">
                  {activeLoad ? (
                    <div className="mt-2">
                      <p className="font-mono text-xs font-semibold text-sky-900 dark:text-sky-200">
                        {activeLoad.id}
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {activeLoad.origin}{" "}
                        <span className="text-zinc-400">→</span> {activeLoad.destination}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {formatEquipment(activeLoad.equipment)} · {formatCurrency(activeLoad.revenue)}
                      </p>
                    </div>
                  ) : null}
                  <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-[13px]">
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase text-[var(--muted)]">Trip</dt>
                      <dd className="font-mono text-sm">{activeTrip.tripId}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-[var(--muted)]">Status</dt>
                      <dd className="capitalize">{activeTrip.status.replace(/_/g, " ")}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-[var(--muted)]">OOR</dt>
                      <dd className="tabular-nums">{activeTrip.oorMiles.toFixed(1)} mi</dd>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <dt className="text-[var(--muted)]">Sched. start</dt>
                        <dd className="mt-0.5 tabular-nums">{formatDateTimeLocal(activeTrip.scheduledStart)}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--muted)]">Sched. end</dt>
                        <dd className="mt-0.5 tabular-nums">{formatDateTimeLocal(activeTrip.scheduledEnd)}</dd>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase text-[var(--muted)]">Miles (sched → actual)</dt>
                      <dd className="tabular-nums">
                        {activeTrip.scheduleMiles.toFixed(1)} → {activeTrip.actualMiles.toFixed(1)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase text-[var(--muted)]">Drive time (sched → actual)</dt>
                      <dd className="tabular-nums">
                        {activeTrip.scheduleMinutes} min → {activeTrip.actualMinutes} min
                      </dd>
                    </div>
                  </dl>
                    </section>
                  </div>
                </CollapsibleBlock>
              )}

              {selectedLoad ? (
                <CollapsibleBlock
                  buttonId="load-fit-disclosure"
                  panelId="load-fit-panel"
                  title="Selected load fit"
                  titleClassName="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]"
                  badge={
                    rankedRow ? (
                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-px text-[10px] font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
                        {Math.min(99, rankedRow.matchPercent + 2)}%
                      </span>
                    ) : null
                  }
                  collapsedHint={
                    selectedLoad
                      ? `${selectedLoad.id} · tap to expand fit detail`
                      : undefined
                  }
                  expanded={loadFitExpanded}
                  onToggle={() => setLoadFitExpanded((v) => !v)}
                  shellClassName="mb-4 border-b border-[var(--border)] pb-3"
                  buttonHoverClassName="hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  chevronClassName="text-zinc-600 dark:text-zinc-400"
                >
                  <div className="pt-1">
                    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/60 p-3">
                      <p className="text-2xl font-bold tabular-nums text-[var(--foreground)]">
                        {rankedRow ? `${Math.min(99, rankedRow.matchPercent + 2)}%` : "—"}{" "}
                        <span className="text-sm font-medium text-zinc-500">match</span>
                      </p>
                      {rankedRow && rankedRow.reasons.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-[13px] text-zinc-600 dark:text-zinc-400">
                          {rankedRow.reasons.map((x, i) => (
                            <li key={`${i}-${x}`} className="flex gap-2">
                              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                              <span>{x}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  </div>
                </CollapsibleBlock>
              ) : null}

              {selectedLoad && rankedRow ? (
                <CollapsibleBlock
                  buttonId="llm-match-disclosure"
                  panelId="llm-match-panel"
                  title="Dispatcher model"
                  titleClassName="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-800/90 dark:text-indigo-300/90"
                  badge={
                    slateRank != null ? (
                      <span className="rounded-md bg-indigo-500/15 px-1.5 py-px text-[10px] font-semibold tabular-nums text-indigo-950 dark:text-indigo-100">
                        #{slateRank}
                      </span>
                    ) : null
                  }
                  collapsedHint="Why this rank for the selected load — expand"
                  expanded={llmInsightExpanded}
                  onToggle={() => setLlmInsightExpanded((v) => !v)}
                  shellClassName="mb-2 border-b border-[var(--border)] bg-gradient-to-b from-indigo-500/[0.07] to-transparent pb-3 dark:from-indigo-950/25"
                  buttonHoverClassName="hover:bg-indigo-500/[0.08] dark:hover:bg-indigo-950/40"
                  chevronClassName="text-indigo-700 dark:text-indigo-300"
                >
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-3 dark:bg-indigo-950/20">
                    {state.loadSelectSource !== "inbox" ? (
                      <>
                        <p className="text-[13px] font-medium leading-snug text-[var(--foreground)]">
                          {shortAiReason(rankedRow, slateRank ?? 1)}
                        </p>
                        <p className="mt-2 text-[12px] leading-snug text-zinc-500 dark:text-zinc-500">
                          Heuristic fit for {selectedLoad.id}. Select loads from the inbox to run the
                          full dispatcher LLM shortlist and synced reasoning for each driver.
                        </p>
                      </>
                    ) : matchLoad.status === "loading" &&
                      matchLoad.loadId === selectedLoad.id ? (
                      <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
                        Running fleet analysis for this load…
                      </p>
                    ) : matchLoad.status === "ready" &&
                      matchLoad.loadId === selectedLoad.id &&
                      matchLoad.result ? (
                      <>
                        {llmRowForDriver ? (
                          <>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                              Shortlist rank {llmRowForDriver.rank} ·{" "}
                              {matchLoad.result.source === "llm"
                                ? "LLM reasoning"
                                : "Heuristic shortlist"}
                            </p>
                            <p className="mt-2 text-[13px] font-medium leading-snug text-[var(--foreground)]">
                              {llmRowForDriver.reasoning}
                            </p>
                            {matchLoad.result.source === "heuristic" && matchLoad.result.error ? (
                              <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-200">
                                LLM unavailable ({matchLoad.result.error}).
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                              Full slate #{slateRank} of {ranked.length} · not in top-3 shortlist
                            </p>
                            <p className="mt-2 text-[13px] leading-snug text-[var(--foreground)]">
                              {shortAiReason(rankedRow, slateRank ?? 1)}
                            </p>
                            <p className="mt-2 text-[12px] leading-snug text-zinc-500 dark:text-zinc-500">
                              The comparison tray shows the model’s top three picks for {selectedLoad.id}.
                              This driver ranked lower on combined fit.
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-[13px] text-zinc-500 dark:text-zinc-500">
                        Match insight will appear when the run finishes.
                      </p>
                    )}
                  </div>
                </CollapsibleBlock>
              ) : null}
              </div>
            </div>

            {ringBrowseActive && ringBrowseTotal > 0 ? (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => bumpMapRingFilterPage(-1)}
                  disabled={state.mapRingFilterPage <= 0}
                  aria-label="Previous driver in this fleet ring"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-lg font-semibold text-zinc-700 outline-none transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] dark:text-zinc-200 dark:hover:bg-white/5"
                >
                  ‹
                </button>
                <p className="min-w-0 flex-1 text-center text-[11px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                  {state.mapRingFilterPage + 1} / {ringBrowseTotal} in ring
                </p>
                <button
                  type="button"
                  onClick={() => bumpMapRingFilterPage(1)}
                  disabled={state.mapRingFilterPage >= ringBrowseTotal - 1}
                  aria-label="Next driver in this fleet ring"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-lg font-semibold text-zinc-700 outline-none transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] dark:text-zinc-200 dark:hover:bg-white/5"
                >
                  ›
                </button>
              </div>
            ) : null}

            {selectedLoad ? (
              <div className="shrink-0 border-t border-[var(--border)] p-4">
                <button
                  type="button"
                  onClick={() =>
                    assign(selectedLoad.id, driver.id, driver.name, {
                      matchPercent: rankedRow
                        ? Math.min(99, rankedRow.matchPercent + 2)
                        : undefined,
                    })
                  }
                  className="w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400"
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
