"use client";

import { LlmMatchLoadingOverlay } from "@/components/layout/LlmMatchLoadingOverlay";
import { ComparisonTray } from "@/components/tray/ComparisonTray";
import { DriverDetailPanel } from "@/components/panel/DriverDetailPanel";
import { LoadDetailPanel } from "@/components/panel/LoadDetailPanel";
import { MapCanvasLazy } from "@/components/map/MapCanvasLazy";
type MapColumnProps = {
  /** From server `OPENWEATHER_API_KEY` — raster tiles run in the client. */
  openWeatherApiKey?: string;
  /** From server: `data/2.5/weather` probe — false avoids 401 tile spam when the key is bad. */
  openWeatherKeyWorks?: boolean;
  /** From server: Maps 2.0 tile probe — when false, overlay uses legacy “current” tiles only. */
  openWeatherMap2TilesWork?: boolean;
};

export function MapColumn({
  openWeatherApiKey = "",
  openWeatherKeyWorks = false,
  openWeatherMap2TilesWork = false,
}: MapColumnProps) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-3 pt-3">
      <LlmMatchLoadingOverlay />
      <MapCanvasLazy
        openWeatherApiKey={openWeatherApiKey}
        openWeatherKeyWorks={openWeatherKeyWorks}
        openWeatherMap2TilesWork={openWeatherMap2TilesWork}
      />
      <ComparisonTray />
      <LoadDetailPanel />
      <DriverDetailPanel />
    </div>
  );
}
