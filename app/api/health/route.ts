import { NextResponse } from "next/server";

/** Liveness — use for deploy probes and quick smoke tests */
export function GET() {
  return NextResponse.json({
    ok: true,
    service: "hacktruck-dispatch-api",
    ts: Date.now(),
  });
}
