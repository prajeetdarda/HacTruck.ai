"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import type { Feature, FeatureCollection, LineString } from "geojson";
import type { LngLatLike } from "mapbox-gl";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import MapGL, {
  AttributionControl,
  Layer,
  Marker,
  NavigationControl,
  Source,
} from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { useDispatchContext } from "@/components/providers/DispatchProvider";
import { useHover } from "@/components/providers/HoverProvider";
import { DEFAULT_MAP_VIEW, svgToLngLat } from "@/lib/geo-bridge";
import { LOADS } from "@/lib/mock-data";
import { Z_MAP } from "@/lib/layout-tokens";
import type { Driver, RankedDriver, RejectTag } from "@/lib/types";
import { useTheme } from "@/components/providers/ThemeProvider";
import { DriverMarkerContent } from "./DriverMarker";
import { PackageDrop } from "./PackageDrop";

const DRAG_BLOCK_REJECTS: RejectTag[] = [
  "wrong_equipment",
  "off_duty",
  "conflict",
];

function rankedAllowsDrag(r?: RankedDriver): boolean {
  if (!r) return true;
  return !r.rejectTags.some((t) => DRAG_BLOCK_REJECTS.includes(t));
}
const DROP_HIT_PX = 52;
const DRAG_MOVE_PX = 7;

const MAP_LOOK_STORAGE_KEY = "hacktruck-map-basemap-look";

type MapBasemapLook = "rich" | "muted";

function lineFeature(
  kind: "connector" | "confirmed" | "confirmedAlt" | "enroute",
  coordinates: LineString["coordinates"],
): Feature<LineString> {
  return {
    type: "Feature",
    properties: { kind },
    geometry: { type: "LineString", coordinates },
  };
}

function PickupMarkerVisual({ loadId }: { loadId: string }) {
  return (
    <div
      className="pointer-events-none relative flex h-12 w-12 items-center justify-center"
      role="img"
      aria-label="Pickup location"
    >
      <PackageDrop loadId={loadId} />
      <div
        className="absolute h-9 w-9 rounded-full border-2 border-amber-400/55"
        style={{
          animation:
            "map-origin-pulse 2.15s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        }}
      />
      <div
        className="absolute h-9 w-9 rounded-full border-2 border-amber-300/45"
        style={{
          animation:
            "map-origin-pulse 2.15s cubic-bezier(0.22, 1, 0.36, 1) infinite",
          animationDelay: "0.65s",
        }}
      />
      <div
        className="absolute h-9 w-9 rounded-full border border-amber-200/35"
        style={{
          animation:
            "map-origin-pulse 2.6s cubic-bezier(0.22, 1, 0.36, 1) infinite",
          animationDelay: "1.15s",
        }}
      />
      <div className="absolute h-10 w-10 animate-pulse rounded-full bg-amber-400/12" />
    </div>
  );
}

export function MapCanvasMapbox() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
  const { theme } = useTheme();
  const [basemapLook, setBasemapLook] = useState<MapBasemapLook>(() => {
    if (typeof window === "undefined") return "rich";
    try {
      const v = localStorage.getItem(MAP_LOOK_STORAGE_KEY);
      return v === "muted" || v === "rich" ? v : "rich";
    } catch {
      return "rich";
    }
  });

  const setBasemapLookPersist = useCallback((next: MapBasemapLook) => {
    setBasemapLook(next);
    try {
      localStorage.setItem(MAP_LOOK_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const mapStyle = useMemo(() => {
    if (basemapLook === "muted") {
      return theme === "dark"
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11";
    }
    return theme === "dark"
      ? "mapbox://styles/mapbox/navigation-night-v1"
      : "mapbox://styles/mapbox/streets-v12";
  }, [theme, basemapLook]);
  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const [draggingDriverId, setDraggingDriverId] = useState<string | null>(null);
  const [markerReset, setMarkerReset] = useState<Record<string, number>>({});
  /** When a load is selected: false = map shows only top-5 candidates (default). */
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  /** Dotted en-route polylines (hidden by default). */
  const [showEnRoutePaths, setShowEnRoutePaths] = useState(false);
  const dragStartRef = useRef<{ lng: number; lat: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const {
    driversSimulated,
    selectedLoad,
    state,
    top5Ids,
    ranked,
    selectDriver,
    assign,
    bumpMapRingFilterPage,
    setMapRingBrowsePage,
  } = useDispatchContext();

  /** Mapbox Directions geometry (driver → pickup) when both load and driver are selected. */
  const [drivingRouteCoords, setDrivingRouteCoords] = useState<
    [number, number][] | null
  >(null);
  /** Road-following routes for all top-5 connector lines. */
  const [connectorRoutes, setConnectorRoutes] = useState<
    Map<string, [number, number][]>
  >(new Map());
  const { hoveredDriverId, setHoveredDriverId } = useHover();

  const rankedById = useMemo(() => {
    const m = new Map(ranked.map((r) => [r.driver.id, r]));
    return m;
  }, [ranked]);

  const rankByDriverId = useMemo(() => {
    const m = new Map<string, number>();
    ranked.forEach((row, i) => m.set(row.driver.id, i + 1));
    return m;
  }, [ranked]);

  const top5Set = useMemo(() => new Set(top5Ids), [top5Ids]);

  const driversOnMap = useMemo(() => {
    let pool: Driver[];
    if (!selectedLoad || showAllDrivers) {
      pool = driversSimulated;
    } else {
      pool = driversSimulated.filter((d) => top5Set.has(d.id));
    }
    if (!selectedLoad && state.mapRingFilter != null) {
      return pool
        .filter((d) => d.ringStatus === state.mapRingFilter)
        .sort((a, b) => a.id.localeCompare(b.id));
    }
    return pool;
  }, [
    driversSimulated,
    selectedLoad,
    showAllDrivers,
    state.mapRingFilter,
    top5Set,
  ]);

  const fleetRingDriversSorted = useMemo(() => {
    if (!state.mapRingFilter) return [];
    return driversSimulated
      .filter((d) => d.ringStatus === state.mapRingFilter)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [driversSimulated, state.mapRingFilter]);

  const fleetBrowsePrevPageRef = useRef<number | null>(null);

  /**
   * Fleet ring browse: clamp page; when the *page index* changes (prev/next, clamp, or effect 2 after a map
   * click), select the driver at that page. Do not force-select L[page] when only `selectedDriverId`
   * changed — that fights the effect below that moves the page to the clicked driver → infinite updates.
   */
  useEffect(() => {
    if (selectedLoad || !state.mapRingFilter) {
      fleetBrowsePrevPageRef.current = null;
      return;
    }
    const L = fleetRingDriversSorted;
    if (L.length === 0) {
      if (state.selectedDriverId) selectDriver(null);
      return;
    }
    const idx = Math.min(state.mapRingFilterPage, L.length - 1);
    if (idx !== state.mapRingFilterPage) {
      setMapRingBrowsePage(idx);
      return;
    }
    const id = L[idx]!.id;
    const page = state.mapRingFilterPage;
    const pageChanged = fleetBrowsePrevPageRef.current !== page;
    fleetBrowsePrevPageRef.current = page;
    if (pageChanged) {
      selectDriver(id);
    }
  }, [
    selectedLoad,
    state.mapRingFilter,
    state.mapRingFilterPage,
    state.selectedDriverId,
    fleetRingDriversSorted,
    selectDriver,
    setMapRingBrowsePage,
  ]);

  /**
   * When the *selected driver* changes (map, list, etc.), align ring browse page to that driver.
   * Do not depend on `mapRingFilterPage`: after Next/Prev, page updates before `selectedDriverId`
   * (effect 1), and this effect would see idx !== page and reset page — undoing pagination.
   */
  useEffect(() => {
    if (selectedLoad || !state.mapRingFilter || !state.selectedDriverId) return;
    const idx = fleetRingDriversSorted.findIndex(
      (d) => d.id === state.selectedDriverId,
    );
    if (idx >= 0 && idx !== state.mapRingFilterPage) {
      setMapRingBrowsePage(idx);
    }
  }, [selectedLoad, state.mapRingFilter, state.selectedDriverId, fleetRingDriversSorted, setMapRingBrowsePage]); // eslint-disable-line react-hooks/exhaustive-deps -- omit state.mapRingFilterPage (would undo Next/Prev; see comment above)

  const fleetRingNav = useMemo(() => {
    if (!state.mapRingFilter) return null;
    const n = fleetRingDriversSorted.length;
    const page = Math.min(
      state.mapRingFilterPage,
      Math.max(0, n - 1),
    );
    return { n, page };
  }, [
    state.mapRingFilter,
    state.mapRingFilterPage,
    fleetRingDriversSorted,
  ]);

  useEffect(() => {
    queueMicrotask(() => setShowAllDrivers(false));
  }, [selectedLoad?.id]);

  const confirmed = state.confirmedAssign;
  const confirmedLoad = confirmed
    ? LOADS.find((l) => l.id === confirmed.loadId)
    : null;

  useEffect(() => {
    if (!selectedLoad || top5Ids.length === 0) {
      startTransition(() => setConnectorRoutes(new Map()));
      return;
    }
    const to = svgToLngLat(selectedLoad.pickupX, selectedLoad.pickupY);
    const ac = new AbortController();
    const jobs = top5Ids.map(async (id) => {
      const driver = driversSimulated.find((d) => d.id === id);
      if (!driver) return null;
      const from = svgToLngLat(driver.x, driver.y);
      const q = new URLSearchParams({
        fromLng: String(from.lng),
        fromLat: String(from.lat),
        toLng: String(to.lng),
        toLat: String(to.lat),
      });
      try {
        const r = await fetch(`/api/directions?${q}`, { signal: ac.signal });
        const body = (await r.json()) as {
          ok?: boolean;
          data?: { coordinates?: [number, number][] };
        };
        if (!r.ok || !body.ok || !body.data?.coordinates) return null;
        return [id, body.data.coordinates] as [string, [number, number][]];
      } catch {
        return null;
      }
    });
    Promise.all(jobs).then((results) => {
      if (ac.signal.aborted) return;
      const m = new Map<string, [number, number][]>();
      for (const entry of results) {
        if (entry) m.set(entry[0], entry[1]);
      }
      startTransition(() => setConnectorRoutes(m));
    });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoad?.id, top5Ids]);

  const linesGeoJSON: FeatureCollection = useMemo(() => {
    const features: Feature<LineString>[] = [];

    const enrouteDrivers =
      selectedLoad && !showAllDrivers
        ? driversSimulated.filter((d) => top5Set.has(d.id))
        : driversSimulated;
    if (showEnRoutePaths) {
      for (const d of enrouteDrivers) {
        if (d.enRoutePath && d.enRoutePath.length >= 2) {
          const coordinates = d.enRoutePath.map((p) => {
            const ll = svgToLngLat(p.x, p.y);
            return [ll.lng, ll.lat] as [number, number];
          });
          features.push(lineFeature("enroute", coordinates));
        }
      }
    }

    if (selectedLoad) {
      const pl = svgToLngLat(selectedLoad.pickupX, selectedLoad.pickupY);
      for (const id of top5Ids) {
        const d = driversSimulated.find((x) => x.id === id);
        if (!d) continue;
        const isConfirmed =
          confirmed &&
          confirmed.loadId === selectedLoad.id &&
          confirmed.driverId === id;
        if (
          !isConfirmed &&
          state.selectedDriverId === id &&
          drivingRouteCoords != null
        ) {
          continue;
        }
        const dl = svgToLngLat(d.x, d.y);
        const routed = connectorRoutes.get(id);
        const coords: LineString["coordinates"] = routed ?? [
          [dl.lng, dl.lat],
          [pl.lng, pl.lat],
        ];
        features.push(
          lineFeature(isConfirmed ? "confirmed" : "connector", coords),
        );
      }
    }

    if (
      confirmedLoad &&
      confirmed &&
      (!selectedLoad || selectedLoad.id !== confirmed.loadId)
    ) {
      const pl = svgToLngLat(confirmedLoad.pickupX, confirmedLoad.pickupY);
      const d = driversSimulated.find((x) => x.id === confirmed.driverId);
      if (d) {
        const dl = svgToLngLat(d.x, d.y);
        features.push(
          lineFeature("confirmedAlt", [
            [pl.lng, pl.lat],
            [dl.lng, dl.lat],
          ]),
        );
      }
    }

    return { type: "FeatureCollection", features };
  }, [
    confirmed,
    confirmedLoad,
    connectorRoutes,
    driversSimulated,
    drivingRouteCoords,
    selectedLoad,
    showAllDrivers,
    showEnRoutePaths,
    state.selectedDriverId,
    top5Ids,
    top5Set,
  ]);

  const drivingRouteGeoJSON: FeatureCollection = useMemo(() => {
    if (!drivingRouteCoords || drivingRouteCoords.length < 2) {
      return { type: "FeatureCollection", features: [] };
    }
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: drivingRouteCoords,
          },
        },
      ],
    };
  }, [drivingRouteCoords]);

  useEffect(() => {
    if (!selectedLoad || !state.selectedDriverId) {
      startTransition(() => setDrivingRouteCoords(null));
      return;
    }
    const driver = driversSimulated.find(
      (d) => d.id === state.selectedDriverId,
    );
    if (!driver) {
      startTransition(() => setDrivingRouteCoords(null));
      return;
    }
    const from = svgToLngLat(driver.x, driver.y);
    const to = svgToLngLat(selectedLoad.pickupX, selectedLoad.pickupY);
    const ac = new AbortController();
    const q = new URLSearchParams({
      fromLng: String(from.lng),
      fromLat: String(from.lat),
      toLng: String(to.lng),
      toLat: String(to.lat),
    });
    startTransition(() => setDrivingRouteCoords(null));
    fetch(`/api/directions?${q}`, { signal: ac.signal })
      .then(async (r) => {
        const body = (await r.json()) as {
          ok?: boolean;
          data?: { coordinates?: [number, number][] };
        };
        if (!r.ok || !body.ok || !body.data?.coordinates) {
          startTransition(() => setDrivingRouteCoords(null));
          return;
        }
        const c = body.data.coordinates;
        if (Array.isArray(c) && c.length >= 2) {
          startTransition(() => setDrivingRouteCoords(c));
        } else {
          startTransition(() => setDrivingRouteCoords(null));
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          startTransition(() => setDrivingRouteCoords(null));
        }
      });
    return () => ac.abort();
  }, [
    driversSimulated,
    selectedLoad,
    state.selectedDriverId,
    state.simulatedHoursOffset,
  ]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (selectedLoad) {
      const ll = svgToLngLat(selectedLoad.pickupX, selectedLoad.pickupY);
      map.flyTo({
        center: [ll.lng, ll.lat] as LngLatLike,
        zoom: 10,
        duration: 700,
        essential: true,
      });
    } else {
      map.flyTo({
        center: [DEFAULT_MAP_VIEW.longitude, DEFAULT_MAP_VIEW.latitude] as LngLatLike,
        zoom: DEFAULT_MAP_VIEW.zoom,
        duration: 520,
        essential: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedLoad?.id
  }, [mapReady, selectedLoad?.id]);

  /** No load: ring browse — pan to the focused truck when filter or selection changes (not every sim tick). */
  useEffect(() => {
    if (!mapReady || selectedLoad) return;
    if (!state.mapRingFilter || !state.selectedDriverId) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const driver = driversSimulated.find((d) => d.id === state.selectedDriverId);
    if (!driver) return;
    const ll = svgToLngLat(driver.x, driver.y);
    map.flyTo({
      center: [ll.lng, ll.lat] as LngLatLike,
      zoom: Math.max(map.getZoom(), 5.35),
      duration: 480,
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit driversSimulated (timeline scrub); fly on browse selection only
  }, [mapReady, selectedLoad, state.mapRingFilter, state.selectedDriverId]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const onResize = () => {
      requestAnimationFrame(() => map.resize());
    };
    window.addEventListener("resize", onResize);
    requestAnimationFrame(onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    requestAnimationFrame(() => map.resize());
  }, [mapReady, mapStyle]);

  const pickupLngLat = useMemo(() => {
    if (!selectedLoad) return null;
    return svgToLngLat(selectedLoad.pickupX, selectedLoad.pickupY);
  }, [selectedLoad]);

  const bumpMarker = useCallback((driverId: string) => {
    setMarkerReset((m) => ({ ...m, [driverId]: (m[driverId] ?? 0) + 1 }));
  }, []);

  const handleDriverDragEnd = useCallback(
    (driver: Driver, lngLat: { lng: number; lat: number }) => {
      const map = mapRef.current?.getMap();
      const start = dragStartRef.current;
      dragStartRef.current = null;

      let moved = false;
      if (map && start) {
        const a = map.project([start.lng, start.lat]);
        const b = map.project([lngLat.lng, lngLat.lat]);
        moved = Math.hypot(a.x - b.x, a.y - b.y) > DRAG_MOVE_PX;
      }

      if (!moved || !selectedLoad) {
        bumpMarker(driver.id);
        return;
      }

      suppressClickUntil.current = Date.now() + 220;
      const pin = svgToLngLat(selectedLoad.pickupX, selectedLoad.pickupY);
      if (!map) {
        bumpMarker(driver.id);
        return;
      }
      const pDrop = map.project([lngLat.lng, lngLat.lat]);
      const pPin = map.project([pin.lng, pin.lat]);
      const dist = Math.hypot(pDrop.x - pPin.x, pDrop.y - pPin.y);

      if (dist <= DROP_HIT_PX) {
        const row = rankedById.get(driver.id);
        if (rankedAllowsDrag(row)) {
          assign(selectedLoad.id, driver.id, driver.name);
        }
      }
      bumpMarker(driver.id);
    },
    [assign, bumpMarker, rankedById, selectedLoad],
  );

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[inset_0_0_48px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_60px_rgba(0,0,0,0.35)]"
      style={{ zIndex: Z_MAP }}
    >
      <MapGL
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        reuseMaps={process.env.NODE_ENV === "production"}
        attributionControl={false}
        initialViewState={DEFAULT_MAP_VIEW}
        style={{ width: "100%", height: "100%" }}
        onLoad={() => setMapReady(true)}
        scrollZoom={{ around: "center" }}
      >
        <AttributionControl compact position="bottom-left" />
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="dispatch-lines" type="geojson" data={linesGeoJSON}>
          <Layer
            id="enroute-lines"
            type="line"
            filter={["==", ["get", "kind"], "enroute"]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "#38bdf8",
              "line-width": 2,
              "line-opacity": 0.45,
              "line-dasharray": [2, 3],
            }}
          />
          <Layer
            id="connector-lines"
            type="line"
            filter={["==", ["get", "kind"], "connector"]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "rgba(56, 189, 248, 0.55)",
              "line-width": 2,
              "line-opacity": 0.9,
              "line-dasharray": [6, 8],
            }}
          />
          <Layer
            id="confirmed-lines"
            type="line"
            filter={[
              "any",
              ["==", ["get", "kind"], "confirmed"],
              ["==", ["get", "kind"], "confirmedAlt"],
            ]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "#34d399",
              "line-width": 3,
              "line-opacity": 0.85,
            }}
          />
        </Source>

        <Source id="dispatch-driving-route" type="geojson" data={drivingRouteGeoJSON}>
          <Layer
            id="driving-route-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "#2563eb",
              "line-width": 5,
              "line-opacity": 0.92,
            }}
          />
        </Source>

        {driversOnMap.map((driver) => {
          const ll = svgToLngLat(driver.x, driver.y);
          const hasSelection = !!selectedLoad;
          const isTop = top5Ids.includes(driver.id);
          const candidatesOnlyView = hasSelection && !showAllDrivers;
          const dimmed =
            hasSelection && !candidatesOnlyView && !isTop;
          const isHovered = hoveredDriverId === driver.id;
          const r = rankedById.get(driver.id);
          const canDrag =
            !!selectedLoad && isTop && rankedAllowsDrag(r);
          const rankForLoad =
            selectedLoad != null
              ? (rankByDriverId.get(driver.id) ?? null)
              : null;
          const fadedBySelection =
            (!!selectedLoad &&
              !!state.selectedDriverId &&
              state.selectedDriverId !== driver.id) ||
            (!selectedLoad &&
              state.mapRingFilter != null &&
              !!state.selectedDriverId &&
              state.selectedDriverId !== driver.id);

          const fleetBrowseFocused =
            !selectedLoad &&
            state.mapRingFilter != null &&
            state.selectedDriverId === driver.id;

          return (
            <Marker
              key={`${driver.id}-${markerReset[driver.id] ?? 0}`}
              longitude={ll.lng}
              latitude={ll.lat}
              anchor="center"
              draggable={canDrag}
              onDragStart={(e) => {
                dragStartRef.current = {
                  lng: e.lngLat.lng,
                  lat: e.lngLat.lat,
                };
                setDraggingDriverId(driver.id);
              }}
              onDragEnd={(e) => {
                setDraggingDriverId(null);
                handleDriverDragEnd(driver, {
                  lng: e.lngLat.lng,
                  lat: e.lngLat.lat,
                });
              }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                if (Date.now() < suppressClickUntil.current) return;
                if (!selectedLoad && state.mapRingFilter) {
                  const ix = fleetRingDriversSorted.findIndex(
                    (d) => d.id === driver.id,
                  );
                  if (ix >= 0) setMapRingBrowsePage(ix);
                }
                selectDriver(driver.id);
              }}
            >
              <div
                onPointerEnter={() => setHoveredDriverId(driver.id)}
                onPointerLeave={() => setHoveredDriverId(null)}
              >
                <DriverMarkerContent
                  driver={driver}
                  dimmed={dimmed}
                  isCandidate={
                    candidatesOnlyView || isTop || fleetBrowseFocused
                  }
                  isHovered={isHovered}
                  fadedBySelection={fadedBySelection}
                  ranked={r}
                  dragging={draggingDriverId === driver.id}
                  rankForLoad={rankForLoad}
                />
              </div>
            </Marker>
          );
        })}

        {selectedLoad && pickupLngLat && (
          <Marker
            longitude={pickupLngLat.lng}
            latitude={pickupLngLat.lat}
            anchor="center"
          >
            <PickupMarkerVisual key={selectedLoad.id} loadId={selectedLoad.id} />
          </Marker>
        )}
      </MapGL>

      <div className="pointer-events-none absolute left-3 top-3 max-w-[min(100%,220px)] rounded-lg border border-black/10 bg-white/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600 backdrop-blur-sm dark:border-white/[0.06] dark:bg-black/50 dark:text-zinc-500">
        Mapbox · Drag a top driver onto the amber pin to assign
      </div>

      <div className="pointer-events-auto absolute bottom-12 left-2 z-20 flex max-w-[min(calc(100%-1rem),260px)] flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/95 p-2 text-[11px] text-zinc-800 shadow-lg backdrop-blur-md dark:text-zinc-200">
        <div className="flex flex-col gap-1.5 border-b border-[var(--border)] pb-2">
          <span className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Map colors
          </span>
          <div
            className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/60 p-0.5"
            role="group"
            aria-label="Map basemap style"
          >
            <button
              type="button"
              aria-pressed={basemapLook === "rich"}
              onClick={() => setBasemapLookPersist("rich")}
              className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] ${
                basemapLook === "rich"
                  ? "bg-sky-500/20 text-sky-900 ring-1 ring-sky-500/35 dark:text-sky-100"
                  : "text-zinc-600 hover:bg-[var(--surface-2)] dark:text-zinc-400"
              }`}
            >
              Default
            </button>
            <button
              type="button"
              aria-pressed={basemapLook === "muted"}
              onClick={() => setBasemapLookPersist("muted")}
              className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] ${
                basemapLook === "muted"
                  ? "bg-zinc-500/20 text-zinc-900 ring-1 ring-zinc-500/30 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-[var(--surface-2)] dark:text-zinc-400"
              }`}
            >
              Muted
            </button>
          </div>
        </div>
        {!selectedLoad && state.mapRingFilter && fleetRingNav && fleetRingNav.n > 0 && (
          <div
            className="flex items-center justify-between gap-1 border-b border-[var(--border)] pb-2"
            role="navigation"
            aria-label="Drivers in filtered fleet group"
          >
            <button
              type="button"
              disabled={fleetRingNav.page <= 0}
              onClick={() => bumpMapRingFilterPage(-1)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg font-medium text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous driver"
            >
              ←
            </button>
            <span className="min-w-[3.5rem] select-none text-center text-[10px] tabular-nums text-[var(--muted)]">
              {fleetRingNav.page + 1} / {fleetRingNav.n}
            </span>
            <button
              type="button"
              disabled={fleetRingNav.page >= fleetRingNav.n - 1}
              onClick={() => bumpMapRingFilterPage(1)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg font-medium text-[var(--foreground)] outline-none transition-colors hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next driver"
            >
              →
            </button>
          </div>
        )}
        <label className="flex cursor-pointer select-none items-start gap-2 rounded-lg px-0.5 py-1 hover:bg-[var(--surface-1)]/80">
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 shrink-0 rounded border-zinc-400 bg-white text-sky-500 accent-sky-500 dark:border-zinc-500 dark:bg-zinc-800"
            checked={showEnRoutePaths}
            onChange={(e) => setShowEnRoutePaths(e.target.checked)}
          />
          <span className="leading-snug">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              En-route paths
            </span>
            <span className="mt-0.5 block text-[10px] font-normal text-zinc-600 dark:text-zinc-500">
              Dotted lines along active routes
            </span>
          </span>
        </label>
        {selectedLoad && (
          <label className="flex cursor-pointer select-none items-start gap-2 rounded-lg border-t border-[var(--border)] px-0.5 pt-2 hover:bg-[var(--surface-1)]/80">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 rounded border-zinc-400 bg-white text-sky-500 accent-sky-500 dark:border-zinc-500 dark:bg-zinc-800"
              checked={showAllDrivers}
              onChange={(e) => setShowAllDrivers(e.target.checked)}
            />
            <span className="leading-snug">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                All drivers
              </span>
              <span className="mt-0.5 block text-[10px] font-normal text-zinc-600 dark:text-zinc-500">
                Off = top 5 only + rank
              </span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
