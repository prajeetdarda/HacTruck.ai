import { assignLoadToDriver } from "@/lib/server/fleet-repository";
import { jsonError, jsonOk } from "@/lib/server/http";

type Body = {
  loadId?: string;
  driverId?: string;
};

/**
 * POST /api/assign — stub persist (in-memory). Body: { loadId, driverId }
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body", 400, "BAD_JSON");
  }

  const loadId = body.loadId?.trim();
  const driverId = body.driverId?.trim();
  if (!loadId || !driverId) {
    return jsonError("loadId and driverId are required", 400, "VALIDATION");
  }

  const result = assignLoadToDriver(loadId, driverId);
  if (!result.ok) {
    return jsonError(result.error, 404, "NOT_FOUND");
  }

  return jsonOk({ assignment: result.record }, { status: 201 });
}
