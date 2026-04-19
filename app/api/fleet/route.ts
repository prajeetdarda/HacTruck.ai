import {
  getFleetName,
  listAssignments,
  listDrivers,
  listLoads,
} from "@/lib/server/fleet-repository";
import { jsonOk } from "@/lib/server/http";

/**
 * GET /api/fleet — full drivers + loads (+ in-memory assignments from POST /api/assign).
 * Replace data source in `lib/server/fleet-repository.ts` when wiring a real DB.
 */
export function GET() {
  return jsonOk({
    fleetName: getFleetName(),
    drivers: listDrivers(),
    loads: listLoads(),
    assignments: listAssignments(),
  });
}
