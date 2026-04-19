/**
 * Split a route polyline at the point nearest to `p` so we can render
 * completed vs remaining legs (driver detail map).
 */

function hypot(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

function projectPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { dist: number; proj: [number, number] } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-18) {
    const proj: [number, number] = [ax, ay];
    return { dist: hypot(px - ax, py - ay), proj };
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const proj: [number, number] = [ax + t * dx, ay + t * dy];
  return { dist: hypot(px - proj[0], py - proj[1]), proj };
}

export function splitPolylineAtNearest(
  coords: [number, number][],
  p: { lng: number; lat: number },
): { completed: [number, number][]; remaining: [number, number][] } {
  if (coords.length === 0) {
    return { completed: [], remaining: [] };
  }
  if (coords.length === 1) {
    return { completed: [...coords], remaining: [] };
  }
  const px = p.lng;
  const py = p.lat;
  let bestDist = Infinity;
  let bestI = 0;
  let bestPoint: [number, number] = coords[0]!;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i]!;
    const b = coords[i + 1]!;
    const { dist, proj } = projectPointOnSegment(
      px,
      py,
      a[0]!,
      a[1]!,
      b[0]!,
      b[1]!,
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestI = i;
      bestPoint = proj;
    }
  }
  const completed = [...coords.slice(0, bestI + 1), bestPoint];
  const remaining = [bestPoint, ...coords.slice(bestI + 1)];
  return { completed, remaining };
}

/** Straight-line fallback when Directions API is unavailable. */
export function straightLineRoute(
  origin: { lng: number; lat: number },
  dest: { lng: number; lat: number },
): [number, number][] {
  return [
    [origin.lng, origin.lat],
    [dest.lng, dest.lat],
  ];
}
