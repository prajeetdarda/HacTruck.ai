import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ForecastListItem = {
  dt: number;
  weather?: { id: number; main: string }[];
  rain?: Record<string, number>;
  snow?: Record<string, number>;
  wind?: { speed: number };
};

function pickForecastSlice(
  list: ForecastListItem[],
  targetMs: number,
): ForecastListItem | null {
  if (!list.length) return null;
  let best = list[0]!;
  let bestD = Math.abs(best.dt * 1000 - targetMs);
  for (const it of list) {
    const d = Math.abs(it.dt * 1000 - targetMs);
    if (d < bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}

/** Heuristic “dispatcher-relevant” adverse conditions from 5-day / 3h forecast. */
function isSevereForecastItem(item: ForecastListItem): boolean {
  const w0 = item.weather?.[0];
  if (!w0) return false;
  const id = w0.id;
  if (id >= 200 && id < 300) return true;
  if (id === 781 || id === 900) return true;
  if (id === 762 || id === 771) return true;
  if (id >= 602 && id <= 622) return true;
  const rain1h = item.rain?.["1h"] ?? 0;
  const rain3h = item.rain?.["3h"] ?? 0;
  if (rain3h >= 8 || rain1h >= 5) return true;
  const snow3h = item.snow?.["3h"] ?? 0;
  if (snow3h >= 5) return true;
  if ((item.wind?.speed ?? 0) >= 20) return true;
  return false;
}

function samplePoints(
  west: number,
  south: number,
  east: number,
  north: number,
): { lat: number; lon: number }[] {
  const cx = (west + east) / 2;
  const cy = (south + north) / 2;
  return [
    { lat: cy, lon: cx },
    { lat: north, lon: west },
    { lat: north, lon: east },
    { lat: south, lon: west },
    { lat: south, lon: east },
  ];
}

export async function GET(req: Request) {
  const key =
    process.env.OPENWEATHER_API_KEY ??
    process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!key) {
    return NextResponse.json(
      { severe: false, disabled: true, reason: "missing_api_key" },
      { status: 200 },
    );
  }

  const { searchParams } = new URL(req.url);
  const west = Number(searchParams.get("west"));
  const south = Number(searchParams.get("south"));
  const east = Number(searchParams.get("east"));
  const north = Number(searchParams.get("north"));
  const atMs = Number(searchParams.get("atMs"));

  if (
    !Number.isFinite(west) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(north) ||
    west >= east ||
    south >= north
  ) {
    return NextResponse.json({ error: "invalid_bounds" }, { status: 400 });
  }

  const targetMs = Number.isFinite(atMs) ? atMs : Date.now();

  const pts = samplePoints(west, south, east, north);
  const urls = pts.map(
    (p) =>
      `https://api.openweathermap.org/data/2.5/forecast?lat=${p.lat}&lon=${p.lon}&units=metric&appid=${encodeURIComponent(key)}`,
  );

  try {
    const responses = await Promise.all(
      urls.map((u) =>
        fetch(u, { cache: "no-store" }).then(async (r) => {
          if (r.status === 401) {
            return { _unauthorized: true as const };
          }
          return r.ok ? r.json() : null;
        }),
      ),
    );

    if (responses.some((b) => b && typeof b === "object" && "_unauthorized" in b)) {
      return NextResponse.json({
        severe: false,
        invalidKey: true,
        atMs: targetMs,
      });
    }

    let severe = false;
    for (const body of responses) {
      if (!body || typeof body !== "object" || !("list" in body)) continue;
      const list = body.list as ForecastListItem[] | undefined;
      if (!list?.length) continue;
      const slice = pickForecastSlice(list, targetMs);
      if (slice && isSevereForecastItem(slice)) {
        severe = true;
        break;
      }
    }

    return NextResponse.json({ severe, atMs: targetMs });
  } catch {
    return NextResponse.json(
      { severe: false, error: "upstream_failed" },
      { status: 200 },
    );
  }
}
