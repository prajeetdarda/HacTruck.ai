import { NextResponse } from "next/server";
import { DRIVERS, getLoad } from "@/lib/backend-db";
import {
  buildMatchLoadPayload,
  heuristicTopThreeForLoad,
} from "@/lib/match-load-llm";
import type { MatchLoadPayload } from "@/lib/match-load-llm";

type LlmTopRow = { rank: number; driverId: string; reasoning: string };

async function callOpenAILlm(
  payload: MatchLoadPayload,
): Promise<LlmTopRow[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const model =
    process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const userContent = `You are an expert truck dispatcher for Arizona freight (Desert Sun Logistics).

Choose the **3 best drivers** to cover the OPEN LOAD below. Use equipment match, HOS, distance to pickup (mapX/mapY vs load pickup), lane familiarity, cost, ring status, active trips, vehicles, and any alerts on those units.

Rules:
- Only use driver IDs from drivers[].id — never invent IDs.
- Prefer assignable drivers (not off_duty / unavailable when avoidable).
- If a driver has an active conflict or wrong equipment, deprioritize unless clearly best.

Return **only** JSON:
{"top3":[{"rank":1,"driverId":"<id>","reasoning":"<concise 1-2 sentences>"},{"rank":2,"driverId":"...","reasoning":"..."},{"rank":3,"driverId":"...","reasoning":"..."}]}

DATA:
${JSON.stringify(payload)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You output only valid JSON. Never invent driver IDs — only choose from the provided drivers list.",
        },
        { role: "user", content: userContent },
      ],
      temperature: 0.25,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${t.slice(0, 240)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty model response");

  const parsed = JSON.parse(raw) as { top3?: LlmTopRow[] };
  const rows = Array.isArray(parsed.top3) ? parsed.top3 : [];
  return rows
    .filter(
      (r) =>
        r &&
        typeof r.driverId === "string" &&
        typeof r.reasoning === "string",
    )
    .map((r, i) => ({
      rank: typeof r.rank === "number" ? r.rank : i + 1,
      driverId: r.driverId,
      reasoning: r.reasoning,
    }));
}

function fillTopThreeFromHeuristic(
  loadId: string,
  existing: LlmTopRow[],
): LlmTopRow[] {
  const load = getLoad(loadId);
  if (!load) return existing.slice(0, 3);
  const h = heuristicTopThreeForLoad(load);
  const seen = new Set(existing.map((e) => e.driverId));
  const out = [...existing];
  for (const r of h) {
    if (out.length >= 3) break;
    if (!seen.has(r.driver.id)) {
      seen.add(r.driver.id);
      out.push({
        rank: out.length + 1,
        driverId: r.driver.id,
        reasoning:
          r.reasons[0] ?? "Heuristic rank to complete top three.",
      });
    }
  }
  return out.slice(0, 3);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const loadId =
    typeof body === "object" &&
    body !== null &&
    "loadId" in body &&
    typeof (body as { loadId: unknown }).loadId === "string"
      ? (body as { loadId: string }).loadId
      : null;

  if (!loadId) {
    return NextResponse.json({ error: "loadId required" }, { status: 400 });
  }

  const load = getLoad(loadId);
  if (!load) {
    return NextResponse.json({ error: "Load not found" }, { status: 404 });
  }

  const payload = buildMatchLoadPayload(loadId);
  if (!payload) {
    return NextResponse.json(
      { error: "Could not build match payload" },
      { status: 500 },
    );
  }

  const driverIds = new Set(DRIVERS.map((d) => d.id));

  if (!process.env.OPENAI_API_KEY?.trim()) {
    const h = heuristicTopThreeForLoad(load);
    return NextResponse.json({
      source: "heuristic" as const,
      top3: h.map((r, i) => ({
        rank: i + 1,
        driverId: r.driver.id,
        reasoning:
          "Heuristic scoring (set OPENAI_API_KEY in .env.local for LLM reasoning).",
      })),
    });
  }

  try {
    let top3 = await callOpenAILlm(payload);
    top3 = top3.filter((r) => driverIds.has(r.driverId)).slice(0, 3);
    if (top3.length < 3) {
      top3 = fillTopThreeFromHeuristic(loadId, top3);
    } else {
      top3 = top3.slice(0, 3);
    }

    return NextResponse.json({
      source: "llm" as const,
      top3,
    });
  } catch (e) {
    const h = heuristicTopThreeForLoad(load);
    const msg = e instanceof Error ? e.message : "LLM error";
    return NextResponse.json({
      source: "heuristic" as const,
      error: msg,
      top3: h.map((r, i) => ({
        rank: i + 1,
        driverId: r.driver.id,
        reasoning:
          r.reasons[0] ??
          "Heuristic fallback while LLM is unavailable.",
      })),
    });
  }
}
