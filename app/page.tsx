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
      <FleetHoverProvider>
        {/* Full-viewport container — map fills 100%, everything else floats */}
        <div className="relative h-screen w-screen overflow-hidden bg-[var(--surface-0)]">
          {/* Map takes full viewport */}
          <MatchLoadProvider>
            <MapColumn
              openWeatherApiKey={openWeatherApiKey}
              openWeatherKeyWorks={openWeatherKeyWorks}
              openWeatherMap2TilesWork={openWeatherMap2TilesWork}
            />
          </MatchLoadProvider>

          {/* TopBar floats on top */}
          <TopBar />

          {/* LoadSidebar floats on left */}
          <LoadSidebar />

          {/* Timeline floats on bottom */}
          <TimelineScrubber />
        </div>
        <Toast />
      </FleetHoverProvider>
    </DispatchProvider>
  );
}
