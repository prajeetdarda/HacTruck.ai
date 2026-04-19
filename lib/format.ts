import type { EquipmentType } from "./types";

export function formatEquipment(eq: EquipmentType): string {
  switch (eq) {
    case "dry_van":
      return "Dry van";
    case "reefer":
      return "Reefer";
    case "flatbed":
      return "Flatbed";
    default:
      return eq;
  }
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Per-mile and other small currency amounts */
export function formatCpm(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Demo fleet is Arizona — display in local (MST) wall time. */
export function formatDateTimeLocal(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Phoenix",
  }).format(new Date(ms));
}

export function formatMinutesAsHrs(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
