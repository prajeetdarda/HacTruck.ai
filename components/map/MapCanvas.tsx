"use client";

import dynamic from "next/dynamic";
import { Z_MAP } from "@/lib/layout-tokens";

/**
 * Mapbox + react-map-gl are huge (WebGL, workers). They must NOT be imported unless
 * a token exists, otherwise `next dev` parses/initializes that graph on every HMR
 * and can peg CPU / freeze the machine even when the UI shows "token missing".
 */
function readMapboxToken(): string {
  return (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim();
}

export type MapCanvasProps = {
  openWeatherApiKey?: string;
  openWeatherKeyWorks?: boolean;
  openWeatherMap2TilesWork?: boolean;
};

const MapCanvasMapbox = dynamic(
  () =>
    import("@/components/map/MapCanvasMapbox").then((m) => ({
      default: m.MapCanvasMapbox,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative min-h-0 flex-1 animate-pulse rounded-2xl border border-[var(--border)] bg-zinc-200/80 dark:bg-zinc-900/80"
        style={{ zIndex: Z_MAP }}
      />
    ),
  },
);

export function MapCanvas({
  openWeatherApiKey = "",
  openWeatherKeyWorks = false,
  openWeatherMap2TilesWork = false,
}: MapCanvasProps) {
  const token = readMapboxToken();
  if (!token) {
    return (
      <div
        className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-6 text-center shadow-[inset_0_0_48px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_60px_rgba(0,0,0,0.35)]"
        style={{ zIndex: Z_MAP }}
      >
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Mapbox token missing
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
          Create{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 text-zinc-800 dark:bg-black/40 dark:text-zinc-300">
            .env.local
          </code>{" "}
          in the{" "}
          <strong className="text-zinc-700 dark:text-zinc-400">project root</strong>{" "}
          (same folder as{" "}
          <code className="text-zinc-700 dark:text-zinc-400">package.json</code>
          ), <em>not</em> inside{" "}
          <code className="text-zinc-700 dark:text-zinc-400">app/</code>. Add:
        </p>
        <code className="block max-w-full break-all rounded-lg border border-black/10 bg-black/[0.04] px-3 py-2 text-left text-[11px] text-zinc-800 dark:border-white/10 dark:bg-black/40 dark:text-zinc-300">
          NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here
        </code>
        <p className="max-w-sm text-xs text-zinc-600 dark:text-zinc-500">
          See{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 text-zinc-800 dark:bg-black/40 dark:text-zinc-300">
            .env.example
          </code>
          . Restart{" "}
          <code className="text-zinc-700 dark:text-zinc-400">npm run dev</code>{" "}
          after
          saving.
        </p>
      </div>
    );
  }

  return (
    <MapCanvasMapbox
      openWeatherApiKey={openWeatherApiKey}
      openWeatherKeyWorks={openWeatherKeyWorks}
      openWeatherMap2TilesWork={openWeatherMap2TilesWork}
    />
  );
}
