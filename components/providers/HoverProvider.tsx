"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type HoverCtx = {
  hoveredDriverId: string | null;
  setHoveredDriverId: (id: string | null) => void;
  hoveredLoadId: string | null;
  setHoveredLoadId: (id: string | null) => void;
};

const HoverCtx = createContext<HoverCtx | null>(null);

type Props = {
  /** When the dispatcher changes the active load, clear map/tray hover sync. */
  activeLoadId: string | null;
  children: React.ReactNode;
};

/**
 * Local hover state so pointer moves do not dispatch through the main fleet
 * reducer (which would re-render every consumer, including Mapbox, on every
 * hover enter/leave).
 */
export function HoverProvider({ activeLoadId, children }: Props) {
  const [hoveredDriverId, setHoveredDriverState] = useState<string | null>(null);
  const [hoveredLoadId, setHoveredLoadState] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setHoveredDriverState(null);
      setHoveredLoadState(null);
    });
  }, [activeLoadId]);

  const setHoveredDriverId = useCallback((id: string | null) => {
    setHoveredDriverState((prev) => (prev === id ? prev : id));
  }, []);

  const setHoveredLoadId = useCallback((id: string | null) => {
    setHoveredLoadState((prev) => (prev === id ? prev : id));
  }, []);

  const value = useMemo(
    () => ({
      hoveredDriverId,
      setHoveredDriverId,
      hoveredLoadId,
      setHoveredLoadId,
    }),
    [hoveredDriverId, setHoveredDriverId, hoveredLoadId, setHoveredLoadId],
  );

  return <HoverCtx.Provider value={value}>{children}</HoverCtx.Provider>;
}

export function useHover() {
  const v = useContext(HoverCtx);
  if (!v) throw new Error("useHover must be used within HoverProvider");
  return v;
}
