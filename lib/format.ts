<<<<<<< HEAD
import type { EquipmentType, RejectTag } from "./types";

export function formatRejectTag(tag: RejectTag): string {
  switch (tag) {
    case "wrong_equipment":
      return "Wrong equipment";
    case "too_far":
      return "Too far";
    case "low_hos":
      return "Low HOS";
    case "off_duty":
      return "Off duty";
    case "conflict":
      return "Conflict";
    default:
      return tag;
  }
}
=======
import type { EquipmentType } from "./types";
>>>>>>> ac9292124734fe01923a682f71ae84fc03f024db

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
