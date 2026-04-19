import { DispatchProvider } from "@/components/providers/DispatchProvider";
import { MapColumn } from "@/components/layout/MapColumn";
import { TopBar } from "@/components/layout/TopBar";
import { LoadSidebar } from "@/components/loads/LoadSidebar";
import { TimelineScrubber } from "@/components/timeline/TimelineScrubber";
import { Toast } from "@/components/ui/Toast";

export default function Home() {
  return (
    <DispatchProvider>
      <div className="grid h-screen min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden bg-[var(--surface-0)] text-[var(--foreground)]">
        <TopBar />
        <div className="relative z-0 flex min-h-0 min-w-0 overflow-hidden border-t border-[var(--border)]">
          <LoadSidebar />
          <MapColumn />
        </div>
        <TimelineScrubber />
        <Toast />
      </div>
    </DispatchProvider>
  );
}
