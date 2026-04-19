import type { Map as MapboxMap } from "mapbox-gl";

const RAIN_ID = "hacktruck-weather-rain";
const WIND_ID = "hacktruck-weather-wind";

function makeImageData(
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  size = 128,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return new ImageData(size, size);
  }
  ctx.clearRect(0, 0, size, size);
  draw(ctx, size);
  return ctx.getImageData(0, 0, size, size);
}

function drawRainIcon(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s * 0.5;
  const cy = s * 0.48;
  const r = s * 0.38;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, "#c7d2fe");
  g.addColorStop(0.45, "#6366f1");
  g.addColorStop(1, "#312e81");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy - r * 0.12, r * 0.28, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.08, cy - r * 0.22, r * 0.32, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.38, cy - r * 0.08, r * 0.26, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = s * 0.045;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const x = cx - r * 0.35 + i * r * 0.32;
    ctx.beginPath();
    ctx.moveTo(x, cy + r * 0.12);
    ctx.lineTo(x - s * 0.02, cy + r * 0.42);
    ctx.stroke();
  }
}

function drawWindIcon(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s * 0.5;
  const cy = s * 0.5;
  const r = s * 0.38;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, "#fde68a");
  g.addColorStop(0.5, "#f59e0b");
  g.addColorStop(1, "#b45309");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = s * 0.055;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const y = cy - r * 0.35 + i * r * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, y);
    ctx.bezierCurveTo(
      cx - r * 0.15,
      y - r * 0.22,
      cx + r * 0.15,
      y + r * 0.22,
      cx + r * 0.55,
      y,
    );
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(251, 191, 36, 0.35)";
  ctx.beginPath();
  ctx.arc(cx + r * 0.35, cy - r * 0.45, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Register custom icons (re-run after `style.load` — style swaps drop images).
 */
export function ensureDemoWeatherMapImages(map: MapboxMap): void {
  if (typeof document === "undefined") return;

  const rain = makeImageData(drawRainIcon);
  const wind = makeImageData(drawWindIcon);

  if (map.hasImage(RAIN_ID)) map.removeImage(RAIN_ID);
  if (map.hasImage(WIND_ID)) map.removeImage(WIND_ID);

  map.addImage(RAIN_ID, rain, { pixelRatio: 1 });
  map.addImage(WIND_ID, wind, { pixelRatio: 1 });
}

export const DEMO_WEATHER_ICON_RAIN = RAIN_ID;
export const DEMO_WEATHER_ICON_WIND = WIND_ID;
