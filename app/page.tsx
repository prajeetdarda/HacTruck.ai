import { MatchLoadProvider } from "@/components/providers/MatchLoadProvider";
import { DispatchProvider } from "@/components/providers/DispatchProvider";
import { FleetHoverProvider } from "@/components/providers/FleetHoverProvider";
import { MapColumn } from "@/components/layout/MapColumn";
import { TopBar } from "@/components/layout/TopBar";
import { LoadSidebar } from "@/components/loads/LoadSidebar";
import { TimelineScrubber } from "@/components/timeline/TimelineScrubber";
import { Toast } from "@/components/ui/Toast";
import {
  verifyOpenWeatherApiKey,
  verifyOpenWeatherMap2TilesWork,
} from "@/lib/verify-open-weather-key";

export default async function Home() {
  const openWeatherApiKey =
    process.env.OPENWEATHER_API_KEY?.trim() ??
    process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY?.trim() ??
    "";

  const openWeatherKeyWorks =
    openWeatherApiKey.length > 0 &&
    (await verifyOpenWeatherApiKey(openWeatherApiKey));

  const openWeatherMap2TilesWork =
    openWeatherKeyWorks &&
    (await verifyOpenWeatherMap2TilesWork(openWeatherApiKey));

  return (
    <DispatchProvider>
      <>
        <div className="grid h-screen min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[var(--surface-0)] text-[var(--foreground)]">
          <TopBar />
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-[var(--border)]">
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              <FleetHoverProvider>
                <LoadSidebar />
                <MatchLoadProvider>
                  <MapColumn
                    openWeatherApiKey={openWeatherApiKey}
                    openWeatherKeyWorks={openWeatherKeyWorks}
                    openWeatherMap2TilesWork={openWeatherMap2TilesWork}
                  />
                </MatchLoadProvider>
              </FleetHoverProvider>
            </div>
          </div>
          <TimelineScrubber />
        </div>
        <Toast />
      </>
    </DispatchProvider>
  );
}
