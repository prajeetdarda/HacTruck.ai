import type { CSSProperties } from "react";
import { useId } from "react";

/** Layered inline SVGs for map markers (no extra deps). */

export function TruckMarkerIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const bodyGradientId = `truck-body-${uid}`;
  const cabGradientId = `truck-cab-${uid}`;
  const glassGradientId = `truck-glass-${uid}`;
  const metalGradientId = `truck-metal-${uid}`;
  const wheelGradientId = `truck-wheel-${uid}`;
  const shadowGradientId = `truck-shadow-${uid}`;

  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={bodyGradientId} x1="7.4" y1="11" x2="24.8" y2="23.4">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="0.18" stopColor="currentColor" stopOpacity="0.98" />
          <stop offset="0.72" stopColor="currentColor" stopOpacity="0.74" />
          <stop offset="1" stopColor="#020617" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={cabGradientId} x1="8.4" y1="11" x2="18.8" y2="18.8">
          <stop offset="0" stopColor="#ecfeff" stopOpacity="0.96" />
          <stop offset="0.32" stopColor="#bae6fd" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={glassGradientId} x1="17.4" y1="12.2" x2="22.8" y2="18.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.94" />
          <stop offset="0.42" stopColor="#dbeafe" stopOpacity="0.88" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={metalGradientId} x1="12" y1="14.4" x2="12" y2="18.4">
          <stop offset="0" stopColor="#f8fafc" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e2e8f0" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id={wheelGradientId} cx="0" cy="0" r="1" gradientTransform="translate(12 20.6) rotate(90) scale(3.2)">
          <stop offset="0" stopColor="#0f172a" />
          <stop offset="0.48" stopColor="#1e293b" />
          <stop offset="0.8" stopColor="#475569" />
          <stop offset="1" stopColor="#020617" />
        </radialGradient>
        <radialGradient id={shadowGradientId} cx="0" cy="0" r="1" gradientTransform="translate(16 25.7) rotate(90) scale(2.6 10.8)">
          <stop offset="0" stopColor="#020617" stopOpacity="0.26" />
          <stop offset="1" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="16" cy="25.7" rx="10.8" ry="2.6" fill={`url(#${shadowGradientId})`} />

      <path
        d="M7.9 18c0-1.36 1.1-2.46 2.46-2.46h6.52l2.12-1.92a2.35 2.35 0 011.58-.61h4.28c.95 0 1.57 1.04 1.1 1.86l-1.96 3.42a3.58 3.58 0 01-3.1 1.8H7.9V18z"
        fill={`url(#${bodyGradientId})`}
        stroke="currentColor"
        strokeOpacity="0.68"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect
        x="8.4"
        y="10.25"
        width="9.5"
        height="6.25"
        rx="1.95"
        fill={`url(#${cabGradientId})`}
        stroke="currentColor"
        strokeOpacity="0.62"
        strokeWidth="1.1"
      />
      <path
        d="M18.5 14.25l1.78-1.58c.25-.22.57-.34.9-.34h3.15c.6 0 .98.65.69 1.18l-1.14 2.06c-.24.42-.68.69-1.16.69H18.5v-2.01z"
        fill={`url(#${glassGradientId})`}
        stroke="#e0f2fe"
        strokeOpacity="0.7"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M10.15 11.8h5.85M10.1 13.55h4.8"
        stroke="#ffffff"
        strokeOpacity="0.58"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <path
        d="M12 14.2l2.7-1.38 2.7 1.38v2.9l-2.7 1.42L12 17.1v-2.9z"
        fill={`url(#${metalGradientId})`}
        stroke="#ffffff"
        strokeOpacity="0.52"
        strokeWidth="0.72"
        strokeLinejoin="round"
      />
      <path
        d="M14.7 12.82v5.7M12.03 14.17l2.67 1.47 2.67-1.47"
        stroke="currentColor"
        strokeOpacity="0.42"
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 20.08h13.6"
        stroke="#ffffff"
        strokeOpacity="0.34"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <circle cx="12.1" cy="21.3" r="2.6" fill={`url(#${wheelGradientId})`} />
      <circle cx="12.1" cy="21.3" r="1.16" fill="#cbd5e1" fillOpacity="0.9" />
      <circle cx="21.05" cy="21.3" r="2.6" fill={`url(#${wheelGradientId})`} />
      <circle cx="21.05" cy="21.3" r="1.16" fill="#cbd5e1" fillOpacity="0.9" />
    </svg>
  );
}

/** Pickup hub marker. */
export function PickupOriginIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const roofGradientId = `pickup-roof-${uid}`;
  const frontGradientId = `pickup-front-${uid}`;
  const sideGradientId = `pickup-side-${uid}`;
  const crateGradientId = `pickup-crate-${uid}`;
  const shadowGradientId = `pickup-shadow-${uid}`;

  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={roofGradientId} x1="6" y1="7.4" x2="17.2" y2="11.2">
          <stop offset="0" stopColor="#fff7ed" stopOpacity="0.95" />
          <stop offset="0.28" stopColor="currentColor" stopOpacity="0.98" />
          <stop offset="1" stopColor="#9a3412" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={frontGradientId} x1="12.5" y1="10.6" x2="18.9" y2="19.7">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.94" />
          <stop offset="0.42" stopColor="currentColor" stopOpacity="0.78" />
          <stop offset="1" stopColor="#78350f" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={sideGradientId} x1="4.8" y1="10.8" x2="11" y2="19.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="0.35" stopColor="currentColor" stopOpacity="0.44" />
          <stop offset="1" stopColor="#431407" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id={crateGradientId} x1="11.4" y1="13.2" x2="14.8" y2="18.2">
          <stop offset="0" stopColor="#fff7ed" stopOpacity="0.96" />
          <stop offset="0.4" stopColor="#fed7aa" stopOpacity="0.94" />
          <stop offset="1" stopColor="#c2410c" stopOpacity="0.58" />
        </linearGradient>
        <radialGradient id={shadowGradientId} cx="0" cy="0" r="1" gradientTransform="translate(12 19.95) rotate(90) scale(1.9 7.6)">
          <stop offset="0" stopColor="#020617" stopOpacity="0.22" />
          <stop offset="1" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="12" cy="19.95" rx="7.6" ry="1.9" fill={`url(#${shadowGradientId})`} />
      <path
        d="M5.3 10.2L11.66 6.8a.72.72 0 01.68 0l6.38 3.4-6.73 3.62L5.3 10.2z"
        fill={`url(#${roofGradientId})`}
        stroke="currentColor"
        strokeOpacity="0.62"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M5.3 10.2v6.6c0 .27.15.53.4.66l6.29 3.44v-7.06L5.3 10.2z"
        fill={`url(#${sideGradientId})`}
        stroke="currentColor"
        strokeOpacity="0.38"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M18.72 10.2v6.6c0 .27-.15.53-.39.66l-6.34 3.44v-7.08l6.73-3.62z"
        fill={`url(#${frontGradientId})`}
        stroke="currentColor"
        strokeOpacity="0.58"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M10.3 14.22l1.67-.92 1.73.92v2.9l-1.73.96-1.67-.96v-2.9z"
        fill={`url(#${crateGradientId})`}
        stroke="#fff7ed"
        strokeOpacity="0.5"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path
        d="M11.98 13.3v4.78M10.34 14.2l1.64.92 1.72-.92"
        stroke="#9a3412"
        strokeOpacity="0.42"
        strokeWidth="0.62"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 12.6h1.55M14.3 12.6h1.55"
        stroke="#ffffff"
        strokeOpacity="0.62"
        strokeWidth="0.72"
        strokeLinecap="round"
      />
    </svg>
  );
}
