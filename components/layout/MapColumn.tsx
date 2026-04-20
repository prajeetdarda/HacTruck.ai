"use client";

import { LlmMatchLoadingOverlay } from "@/components/layout/LlmMatchLoadingOverlay";
import { ComparisonTray } from "@/components/tray/ComparisonTray";
import { DriverDetailPanel } from "@/components/panel/DriverDetailPanel";
import { LoadDetailPanel } from "@/components/panel/LoadDetailPanel";
import { MapCanvasLazy } from "@/components/map/MapCanvasLazy";

type MapColumnProps = {
  openWeatherApiKey?: string;
  openWeatherKeyWorks?: boolean;
  openWeatherMap2TilesWork?: boolean;
};

export function MapColumn({
  openWeatherApiKey = "",
  openWeatherKeyWorks = false,
  openWeatherMap2TilesWork = false,
}: MapColumnProps) {
  return (
    <div className="absolute inset-0">
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
