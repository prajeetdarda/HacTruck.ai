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
