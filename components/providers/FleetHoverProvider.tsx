"use client";

import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { HoverProvider } from "@/components/providers/HoverProvider";

export function FleetHoverProvider({ children }: { children: React.ReactNode }) {
  const { state } = useDispatchContext();
  return (
    <HoverProvider activeLoadId={state.selectedLoadId}>
      {children}
    </HoverProvider>
  );
}
