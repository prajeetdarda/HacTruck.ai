import { listAssignments, listDrivers, getLoadById } from "@/lib/server/fleet-repository";
import { driverForSimulation } from "@/lib/simulation";
import { svgToLngLat } from "@/lib/geo-bridge";
import { jsonError, jsonOk } from "@/lib/server/http";

/**
 * GET /api/tracking?offsetHours=0
 * Returns simulated real-time positions for every driver.
 * offsetHours (default 0) scrubs the simulation forward in time — useful for
 * the timeline slider. Coordinates are WGS84 (lng/lat) suitable for Mapbox.
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("offsetHours");
  const offsetHours = raw != null && raw !== "" ? Number(raw) : 0;

  if (!Number.isFinite(offsetHours) || offsetHours < 0 || offsetHours > 72) {
    return jsonError("offsetHours must be a number between 0 and 72", 400, "VALIDATION");
  }

  const drivers = listDrivers();
  const assignments = listAssignments();

  const positions = drivers.map((driver) => {
    const assignment = assignments.find((a) => a.driverId === driver.id);
    const assignedLoad = assignment ? getLoadById(assignment.loadId) ?? null : null;

    const simDriver = driverForSimulation(driver, assignedLoad, offsetHours);
    const { lng, lat } = svgToLngLat(simDriver.x, simDriver.y);

    return {
      driverId: simDriver.id,
      name: simDriver.name,
      initials: simDriver.initials,
      truckLabel: simDriver.truckLabel,
      lng,
      lat,
      ringStatus: simDriver.ringStatus,
      hosRemainingHours: simDriver.hosRemainingHours,
      assignedLoadId: assignment?.loadId ?? null,
    };
  });

  return jsonOk({ offsetHours, ts: Date.now(), positions });
}
