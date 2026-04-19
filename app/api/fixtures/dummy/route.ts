import { getDummyFleetPayload } from "@/lib/dummy-data";
import { jsonOk } from "@/lib/server/http";

/**
 * GET /api/fixtures/dummy — small deterministic dataset for tests / Postman.
 * Does not affect the in-memory assignment store used by /api/fleet.
 */
export function GET() {
  return jsonOk(getDummyFleetPayload());
}
