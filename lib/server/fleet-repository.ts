/**
 * In-memory fleet “database” for API route handlers.
 * Replace with Prisma / Drizzle / external API later — keep method names stable.
 */
import { DRIVERS, FLEET_NAME, LOADS } from "@/lib/mock-data";
import type { Driver, Load } from "@/lib/types";

export type AssignmentRecord = {
  loadId: string;
  driverId: string;
  assignedAt: number;
};

const assignments = new Map<string, AssignmentRecord>();

export function getFleetName(): string {
  return FLEET_NAME;
}

export function listDrivers(): Driver[] {
  return DRIVERS;
}

export function listLoads(): Load[] {
  return LOADS;
}

export function getDriverById(id: string): Driver | undefined {
  return DRIVERS.find((d) => d.id === id);
}

export function getLoadById(id: string): Load | undefined {
  return LOADS.find((l) => l.id === id);
}

export function listAssignments(): AssignmentRecord[] {
  return [...assignments.values()];
}

/**
 * Stub persist — returns the row you would insert in a real DB.
 */
export function assignLoadToDriver(
  loadId: string,
  driverId: string,
): { ok: true; record: AssignmentRecord } | { ok: false; error: string } {
  const load = getLoadById(loadId);
  const driver = getDriverById(driverId);
  if (!load) return { ok: false, error: "Load not found" };
  if (!driver) return { ok: false, error: "Driver not found" };

  const record: AssignmentRecord = {
    loadId,
    driverId,
    assignedAt: Date.now(),
  };
  assignments.set(loadId, record);
  return { ok: true, record };
}

export function clearAssignmentsForDev() {
  assignments.clear();
}
