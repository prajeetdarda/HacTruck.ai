"use client";

import { ComparisonTray } from "@/components/tray/ComparisonTray";
import { DriverDetailPanel } from "@/components/panel/DriverDetailPanel";
import { MapCanvasLazy } from "@/components/map/MapCanvasLazy";
import { HoverProvider } from "@/components/providers/HoverProvider";
import { useDispatchContext } from "@/components/providers/DispatchProvider";

export function MapColumn() {
  const { state } = useDispatchContext();
  const loadId = state.selectedLoadId;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-3 pt-3">
      <HoverProvider activeLoadId={loadId}>
        <MapCanvasLazy />
        <ComparisonTray key={loadId ?? "none"} />
      </HoverProvider>
      <DriverDetailPanel />
    </div>
  );
}
