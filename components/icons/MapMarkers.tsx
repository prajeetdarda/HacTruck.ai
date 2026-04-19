import type { CSSProperties } from "react";

/** Inline SVGs for map markers (no extra deps). */

export function TruckMarkerIcon({
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
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 21v3h2.8a2.2 2.2 0 004.4 0H16a2.2 2.2 0 004.4 0H27v-5.5l-1.8-3.6h-4.6l-1.8 3.6H5V21z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M19.5 14.9h4.7l1.8 3.6V21"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14.9V9h11v5.9"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.06"
      />
      <circle cx="9.5" cy="23.25" r="2" fill="currentColor" fillOpacity="0.35" />
      <circle cx="9.5" cy="23.25" r="1.1" fill="currentColor" />
      <circle cx="18.2" cy="23.25" r="2" fill="currentColor" fillOpacity="0.35" />
      <circle cx="18.2" cy="23.25" r="1.1" fill="currentColor" />
      <path
        d="M10.5 9V6h2v3M14.5 9V7h1.8v2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Pickup / warehouse hub */
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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 10L12 5l9 5v11H3V10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path
        d="M9 16V21h6v-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 12h2M11 12h2M15 12h2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
