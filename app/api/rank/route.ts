import { getLoadById, listDrivers } from "@/lib/server/fleet-repository";
import { rankDriversForLoad } from "@/lib/scoring";
import { jsonError, jsonOk } from "@/lib/server/http";

/**
 * GET /api/rank?loadId=L-1001
 * Returns all drivers ranked for the given load, best match first.
 * Each entry includes score (0–100), matchPercent, reasons, rejectTags, and raw features.
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loadId = searchParams.get("loadId")?.trim();

  if (!loadId) {
    return jsonError("loadId query param is required", 400, "VALIDATION");
  }

  const load = getLoadById(loadId);
  if (!load) {
    return jsonError(`Load ${loadId} not found`, 404, "NOT_FOUND");
  }

  const drivers = listDrivers();
  const ranked = rankDriversForLoad(load, drivers);

  return jsonOk({
    loadId: load.id,
    origin: load.origin,
    destination: load.destination,
    equipment: load.equipment,
    ranked: ranked.map((r) => ({
      driverId: r.driver.id,
      name: r.driver.name,
      truckLabel: r.driver.truckLabel,
      ringStatus: r.driver.ringStatus,
      score: r.score,
      matchPercent: r.matchPercent,
      reasons: r.reasons,
      rejectTags: r.rejectTags,
      features: r.features,
    })),
  });
}
