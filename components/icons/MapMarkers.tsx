import type { CSSProperties } from "react";
import type { Driver } from "@/lib/types";

type RingStatus = Driver["ringStatus"];

/** Ring status accent (badge, borders, SVG strokes). */
export const RING_STATUS_COLOR: Record<RingStatus, string> = {
  urgent: "#ef4444",
  watch: "#f59e0b",
  good: "#10b981",
  inactive: "#9ca3af",
  en_route: "#38bdf8",
  available: "#10b981",
  constrained: "#ea580c",
  off_duty: "#9ca3af",
  unavailable: "#71717a",
};

const RING_BADGE_BG = RING_STATUS_COLOR;

/** Tiny white glyph inside the status bubble (10×10 viewBox). */
function RingStatusGlyph({ status }: { status: RingStatus }) {
  const stroke = "white";
  const sw = 1.85;
  switch (status) {
    case "urgent":
      return (
        <>
          <path
            d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </>
      );
    case "watch":
      return (
        <>
          <path
            d="M5 1.5 L8.5 8.5 H1.5 Z"
            fill="none"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path
            d="M5 3.3 V5.9"
            stroke={stroke}
            strokeWidth={1.35}
            strokeLinecap="round"
          />
          <circle cx="5" cy="7.6" r="0.85" fill={stroke} />
        </>
      );
    case "good":
      return (
        <path
          d="M2.2 5.2 L4.3 7.4 L8.2 3.2"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "inactive":
    case "off_duty":
    case "unavailable":
      return (
        <path
          d="M1.5 5 H8.5"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      );
    case "en_route":
      return (
        <path
          d="M2 5 L5 2 L8 5 L5 8 Z"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      );
    case "available":
      return (
        <path
          d="M2.2 5.2 L4.3 7.4 L8.2 3.2"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "constrained":
      return (
        <>
          <path
            d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5"
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </>
      );
    default:
      return null;
  }
}

/**
 * Ring-colored status dot with micro glyph — map markers use `size="sm"` (top-right on truck).
 */
export function RingStatusNotificationBadge({
  status,
  className = "",
  size = "md",
}: {
  status: RingStatus;
  className?: string;
  /** `sm`: compact bubble for map truck corner. */
  size?: "md" | "sm";
}) {
  const isSm = size === "sm";
  const px = isSm ? 10 : 14;
  const svgPx = isSm ? 5.5 : 8;
  const border = isSm ? "1.5px solid #fff" : "2px solid #fff";
  return (
    <div
      className={`pointer-events-none absolute z-[2] flex items-center justify-center rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.34)] ${isSm ? "-right-0.5 -top-0.5" : "-right-1 -top-1"} ${className}`}
      style={{
        width: `${px}px`,
        height: `${px}px`,
        backgroundColor: RING_BADGE_BG[status],
        border,
      }}
      aria-hidden
    >
      <svg
        width={svgPx}
        height={svgPx}
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <RingStatusGlyph status={status} />
      </svg>
    </div>
  );
}

/** Fleet truck artwork (`public/truck-icon.png`) — transparent PNG only. */
export const TRUCK_MARKER_IMAGE_SRC = "/truck-icon.png" as const;

export function TruckMarkerIcon({
  className,
  style,
  ringStatus: _ringStatus,
  statusStrokeOverride: _statusStrokeOverride,
}: {
  className?: string;
  style?: CSSProperties;
  ringStatus: RingStatus;
  /** When set, outline uses this color instead of ring status (e.g. load-pick mode). */
  statusStrokeOverride?: string;
}) {
  return (
    <span
      className={
        className
          ? `${className} inline-flex items-center justify-center bg-transparent`
          : "inline-flex h-10 w-10 items-center justify-center bg-transparent"
      }
      style={style}
      aria-hidden
    >
      <img
        src={TRUCK_MARKER_IMAGE_SRC}
        alt=""
        className="pointer-events-none h-full w-full shrink-0 select-none object-contain mix-blend-multiply bg-transparent"
        draggable={false}
      />
    </span>
  );
}

/** “My location” / GPS target — uses currentColor for the control button. */
export function LocateMeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="3.25"
        fill="currentColor"
        opacity={0.95}
      />
      <path
        d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Bold 3D-style pickup hub (amber warehouse + dock). Self-colored; ignores currentColor.
 * Small top-right “notification” bubble with a mini crate / load glyph.
 */
export function PickupOriginIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="pickup-wall"
          x1="4"
          y1="10"
          x2="28"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fde68a" />
          <stop offset="0.35" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="pickup-roof" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fffbeb" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fcd34d" stopOpacity="0.15" />
        </linearGradient>
        <filter
          id="pickup-drop"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="2.5"
            stdDeviation="2.2"
            floodColor="#000"
            floodOpacity="0.32"
          />
        </filter>
      </defs>

      {/* Ground */}
      <ellipse cx="24" cy="41" rx="18" ry="4" fill="#000" opacity="0.18" />

      {/* Right depth wall */}
      <path
        d="M30 20 L44 24 L44 38 L30 35 Z"
        fill="#92400e"
        opacity={0.95}
      />

      {/* Main facade */}
      <path
        filter="url(#pickup-drop)"
        d="M6 20 h26 a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V22a2 2 0 0 1 2-2z"
        fill="url(#pickup-wall)"
      />

      {/* Roof (closed gable) */}
      <path
        d="M5 20 L20 6.5 L35 20 Z"
        fill="#d97706"
        stroke="#78350f"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M7 18.5 L20 7.5 L33 18.5 Z"
        fill="url(#pickup-roof)"
        opacity={0.92}
      />

      {/* Roll-up door */}
      <path
        d="M14 26 h12 v14H14z"
        fill="#292524"
        opacity={0.88}
      />
      <path
        d="M14 28 h12 M14 31 h12 M14 34 h12"
        stroke="#57534e"
        strokeWidth="0.9"
      />

      {/* Dock lip */}
      <path
        d="M4 38 h36 v2H4z"
        fill="#92400e"
        opacity={0.9}
      />
      <path
        d="M4 38 h36"
        stroke="#fcd34d"
        strokeWidth="1"
        strokeOpacity={0.35}
      />

      {/* Windows */}
      <rect x="9" y="24" width="3.5" height="3" rx="0.4" fill="#0c4a6e" opacity="0.75" />
      <rect x="28" y="24" width="3.5" height="3" rx="0.4" fill="#0c4a6e" opacity="0.75" />

      {/* Corner safety stripe */}
      <path
        d="M6 36 h5"
        stroke="#facc15"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.85}
      />

      {/* Notification bubble — mini load / crate */}
      <circle
        cx="38.5"
        cy="11.5"
        r="6.2"
        fill="#b45309"
        stroke="#fff"
        strokeWidth="1.6"
      />
      <path
        d="M35.8 10.8 L38.5 9.2 L41.2 10.8 L38.5 12.4 Z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <path
        d="M35.8 10.8 L35.8 13.6 L38.5 15.2 L38.5 12.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <path
        d="M35.8 13.6 L38.5 15.2 L41.2 13.6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Compact pallet / crate for open-load map nodes (pairs with truck marker sizing). */
export function LoadCargoMarkerIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const wood = "#92400e";
  const tape = "#d97706";
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="20" cy="34" rx="14" ry="2.5" fill="#000" opacity={0.16} />
      <path
        d="M6 14 L20 9 L34 14 L34 26 L20 31 L6 26 Z"
        fill="#fde68a"
        stroke={wood}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path
        d="M6 14 L20 19 L34 14"
        stroke={wood}
        strokeWidth={1}
        strokeLinejoin="round"
        opacity={0.85}
      />
      <path
        d="M20 19 L20 31"
        stroke={wood}
        strokeWidth={1}
        strokeLinejoin="round"
        opacity={0.85}
      />
      <path
        d="M11 16.5 L20 13 L29 16.5"
        stroke={tape}
        strokeWidth={1.35}
        strokeLinecap="round"
        opacity={0.9}
      />
      <rect
        x="15"
        y="21"
        width="10"
        height="6"
        rx="0.8"
        fill="#292524"
        opacity={0.35}
      />
    </svg>
  );
}
