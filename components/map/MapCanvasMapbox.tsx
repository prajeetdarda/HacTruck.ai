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
import { useNow } from "@/hooks/useNow";
import { buildPressureHeatmapGeoJSON } from "@/lib/dispatch-pressure-heatmap";
import { DEFAULT_MAP_VIEW, svgToLngLat } from "@/lib/geo-bridge";
import {
  clampSimulatedMsForOwmMap2,
  openWeatherLegacyTileTemplate,
  openWeatherMap2DateSecondsUtc,
  openWeatherMap2TileTemplate,
} from "@/lib/open-weather-tiles";
import { LOADS } from "@/lib/mock-data";
import { Z_MAP } from "@/lib/layout-tokens";
import { rankedAllowsAssignment } from "@/lib/scoring";
import {
  DEMO_WEATHER_ICON_RAIN,
  DEMO_WEATHER_ICON_WIND,
  ensureDemoWeatherMapImages,
} from "@/lib/weather-map-icons";
import { buildDemoWeatherIconCollection } from "@/lib/weather-overlay-geojson";
import type { Driver } from "@/lib/types";
import { LocateMeIcon, PickupOriginIcon } from "@/components/icons/MapMarkers";
import { useTheme } from "@/components/providers/ThemeProvider";
import { DriverMarkerContent } from "./DriverMarker";
import { LoadMarkerContent } from "./LoadMarker";

const DROP_HIT_PX = 52;
const DRAG_MOVE_PX = 7;

const MAP_LOOK_STORAGE_KEY = "hacktruck-map-basemap-look";

type MapBasemapLook = "rich" | "muted";

const HEATMAP_PULSE_PERIOD_MS = 2500;
/** Pixels — large so a few spread-out points still read at ~zoom 6. */
const HEATMAP_BASE_RADIUS_DEMAND = 92;
const HEATMAP_BASE_RADIUS_SUPPLY = 96;
const HEATMAP_PULSE_AMPLITUDE = 0.085;
const HEATMAP_INTENSITY_DEMAND_BASE = 1.45;
const HEATMAP_INTENSITY_SUPPLY_BASE = 1.32;

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

type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type MapCanvasMapboxProps = {
  /** Injected from server (reads `OPENWEATHER_API_KEY` from `.env.local`). */
  openWeatherApiKey?: string;
  /** Server probe: `data/2.5/weather` returned 200 for this key. */
  openWeatherKeyWorks?: boolean;
  /** Server probe: Maps 2.0 tile returned 200 — enables scrub-synced forecast tiles. */
  openWeatherMap2TilesWork?: boolean;
};

export function MapCanvasMapbox({
  openWeatherApiKey = "",
  openWeatherKeyWorks = false,
  openWeatherMap2TilesWork = false,
}: MapCanvasMapboxProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
  const effectiveOwmKey = openWeatherKeyWorks
    ? (
        openWeatherApiKey.trim() ||
        (process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY ?? "").trim()
      )
    : "";
  const openWeatherKeyRejected =
    !openWeatherKeyWorks &&
    (openWeatherApiKey.trim().length > 0 ||
      (process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY ?? "").trim().length > 0);
  const { theme } = useTheme();
  const [basemapLook, setBasemapLook] = useState<MapBasemapLook>("rich");

  useEffect(() => {
    try {
      const v = localStorage.getItem(MAP_LOOK_STORAGE_KEY);
      if (v === "muted" || v === "rich") {
        queueMicrotask(() => setBasemapLook(v));
      }
    } catch {
      /* ignore */
    }
  }, []);

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
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [draggingDriverId, setDraggingDriverId] = useState<string | null>(null);
  const [markerReset, setMarkerReset] = useState<Record<string, number>>({});
  /** When a load is selected: false = map shows only top-5 candidates (default). */
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  /** Dotted en-route polylines (hidden by default). */
  const [showEnRoutePaths, setShowEnRoutePaths] = useState(false);
  /** Open loads as clickable map nodes (pickup coordinates). */
  const [showLoadNodes, setShowLoadNodes] = useState(false);
  /** Dispatch pressure heatmap (demand red / supply blue). */
  const [showPressureHeatmap, setShowPressureHeatmap] = useState(false);
  /** OpenWeather raster overlay (clouds + precipitation). */
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);
  /** Bottom-left map options panel (basemap, layers, toggles). */
  const [mapControlsOpen, setMapControlsOpen] = useState(true);
  const [viewportBounds, setViewportBounds] = useState<MapBounds | null>(null);
  const [severeWeatherInView, setSevereWeatherInView] = useState(false);
  const severeFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartRef = useRef<{ lng: number; lat: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const heatmapNowMs = useNow(45_000);

  const {
    driversSimulated,
    selectedLoad,
    state,
    top5Ids,
    ranked,
    selectDriver,
    selectLoad,
    assign,
  } = useDispatchContext();

  /** Mapbox Directions geometry (driver → pickup) when both load and driver are selected. */
  const [drivingRouteCoords, setDrivingRouteCoords] = useState<
    [number, number][] | null
  >(null);
  const { hoveredDriverId, setHoveredDriverId, hoveredLoadId } = useHover();

  const rankedById = useMemo(() => {
    const m = new Map(ranked.map((r) => [r.driver.id, r]));
    return m;
  }, [ranked]);

  const assignableRanked = useMemo(
    () => ranked.filter(rankedAllowsAssignment),
    [ranked],
  );

  const rankByDriverId = useMemo(() => {
    const m = new Map<string, number>();
    assignableRanked.forEach((row, i) => m.set(row.driver.id, i + 1));
    return m;
  }, [assignableRanked]);

  const top5Set = useMemo(() => new Set(top5Ids), [top5Ids]);

  const driversOnMap = useMemo(() => {
    if (selectedLoad) {
      if (showAllDrivers) return driversSimulated;
      return driversSimulated.filter((d) => top5Set.has(d.id));
    }
    if (state.mapRingFilter) {
      return driversSimulated.filter(
        (d) => d.ringStatus === state.mapRingFilter,
      );
    }
    return driversSimulated;
  }, [
    driversSimulated,
    selectedLoad,
    showAllDrivers,
    top5Set,
    state.mapRingFilter,
  ]);

  const openLoads = useMemo(
    () => LOADS.filter((l) => !state.assignments[l.id]),
    [state.assignments],
  );

  const pressureHeatmapGeoJSON: FeatureCollection = useMemo(
    () =>
      buildPressureHeatmapGeoJSON(
        openLoads,
        driversSimulated,
        heatmapNowMs,
        state.simulatedHoursOffset,
      ),
    [
      openLoads,
      driversSimulated,
      heatmapNowMs,
      state.simulatedHoursOffset,
    ],
  );

  /** Wall + timeline scrub — matches heatmap / dispatch simulation clock. */
  const simulatedWeatherMs = useMemo(
    () => heatmapNowMs + state.simulatedHoursOffset * 3600000,
    [heatmapNowMs, state.simulatedHoursOffset],
  );

  const clampedWeatherMsForTiles = useMemo(
    () => clampSimulatedMsForOwmMap2(simulatedWeatherMs, heatmapNowMs),
    [simulatedWeatherMs, heatmapNowMs],
  );

  const weatherMapDateSecUtc = useMemo(
    () => openWeatherMap2DateSecondsUtc(clampedWeatherMsForTiles),
    [clampedWeatherMsForTiles],
  );

  const owmCloudTiles = useMemo(() => {
    if (!effectiveOwmKey) return [];
    if (openWeatherMap2TilesWork) {
      return [
        openWeatherMap2TileTemplate(
          "CL",
          weatherMapDateSecUtc,
          effectiveOwmKey,
          0.42,
        ),
      ];
    }
    return [openWeatherLegacyTileTemplate("clouds_new", effectiveOwmKey)];
  }, [effectiveOwmKey, openWeatherMap2TilesWork, weatherMapDateSecUtc]);

  const owmPrecipTiles = useMemo(() => {
    if (!effectiveOwmKey) return [];
    if (openWeatherMap2TilesWork) {
      return [
        openWeatherMap2TileTemplate(
          "PR0",
          weatherMapDateSecUtc,
          effectiveOwmKey,
          0.48,
        ),
      ];
    }
    return [
      openWeatherLegacyTileTemplate("precipitation_new", effectiveOwmKey),
    ];
  }, [effectiveOwmKey, openWeatherMap2TilesWork, weatherMapDateSecUtc]);

  const demoWeatherIconCollection = useMemo(
    () => buildDemoWeatherIconCollection(state.simulatedHoursOffset),
    [state.simulatedHoursOffset],
  );

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const onStyleLoad = () => {
      ensureDemoWeatherMapImages(map);
    };
    const onStyleImageMissing = (e: { id: string }) => {
      if (e.id === DEMO_WEATHER_ICON_RAIN || e.id === DEMO_WEATHER_ICON_WIND) {
        ensureDemoWeatherMapImages(map);
      }
    };

    map.on("style.load", onStyleLoad);
    map.on("styleimagemissing", onStyleImageMissing);
    if (map.isStyleLoaded()) {
      queueMicrotask(() => ensureDemoWeatherMapImages(map));
    }

    return () => {
      map.off("style.load", onStyleLoad);
      map.off("styleimagemissing", onStyleImageMissing);
    };
  }, [mapReady, mapStyle]);

  const syncViewportBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    setViewportBounds({
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    });
  }, []);

  useEffect(() => {
    if (!effectiveOwmKey) {
      queueMicrotask(() => setSevereWeatherInView(false));
      return;
    }
    if (!mapReady || !viewportBounds) return;
    if (severeFetchTimerRef.current) {
      clearTimeout(severeFetchTimerRef.current);
    }
    severeFetchTimerRef.current = setTimeout(() => {
      const { west, south, east, north } = viewportBounds;
      const q = new URLSearchParams({
        west: String(west),
        south: String(south),
        east: String(east),
        north: String(north),
        atMs: String(simulatedWeatherMs),
      });
      fetch(`/api/weather/severity?${q}`)
        .then((r) => r.json())
        .then((body: { severe?: boolean; disabled?: boolean }) => {
          if (body?.disabled) {
            setSevereWeatherInView(false);
            return;
          }
          setSevereWeatherInView(!!body?.severe);
        })
        .catch(() => setSevereWeatherInView(false));
    }, 480);
    return () => {
      if (severeFetchTimerRef.current) {
        clearTimeout(severeFetchTimerRef.current);
      }
    };
  }, [mapReady, effectiveOwmKey, viewportBounds, simulatedWeatherMs]);

  useEffect(() => {
    queueMicrotask(() => setShowAllDrivers(false));
  }, [selectedLoad?.id]);

  const confirmed = state.confirmedAssign;
  const confirmedLoad = confirmed
    ? LOADS.find((l) => l.id === confirmed.loadId)
    : null;

  const linesGeoJSON: FeatureCollection = useMemo(() => {
    const features: Feature<LineString>[] = [];

    const enrouteDrivers =
      selectedLoad && !showAllDrivers
        ? driversSimulated.filter((d) => top5Set.has(d.id))
        : !selectedLoad && state.mapRingFilter
          ? driversSimulated.filter(
              (d) => d.ringStatus === state.mapRingFilter,
            )
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
        const coords: LineString["coordinates"] = [
          [pl.lng, pl.lat],
          [dl.lng, dl.lat],
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
    driversSimulated,
    drivingRouteCoords,
    selectedLoad,
    showAllDrivers,
    showEnRoutePaths,
    state.mapRingFilter,
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

  /** Center on pickup when a load is chosen for dispatch; keep the viewport when clearing (free map browse). */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (selectedLoad) {
      const ll = svgToLngLat(selectedLoad.pickupX, selectedLoad.pickupY);
      map.flyTo({
        center: [ll.lng, ll.lat] as LngLatLike,
        zoom: 5.85,
        duration: 520,
        essential: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedLoad?.id
  }, [mapReady, selectedLoad?.id]);

  /** Center on the focused truck when browsing by fleet ring (no load selected). */
  useEffect(() => {
    if (!mapReady) return;
    if (selectedLoad) return;
    if (!state.mapRingFilter || !state.selectedDriverId) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const d = driversSimulated.find((x) => x.id === state.selectedDriverId);
    if (!d) return;
    const ll = svgToLngLat(d.x, d.y);
    map.flyTo({
      center: [ll.lng, ll.lat] as LngLatLike,
      zoom: Math.max(map.getZoom(), 5.35),
      duration: 420,
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refocus when browse target changes
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
        if (rankedAllowsAssignment(row)) {
          assign(selectedLoad.id, driver.id, driver.name);
        }
      }
      bumpMarker(driver.id);
    },
    [assign, bumpMarker, rankedById, selectedLoad],
  );

  useEffect(() => {
    if (!geoHint) return;
    const t = window.setTimeout(() => setGeoHint(null), 6500);
    return () => window.clearTimeout(t);
  }, [geoHint]);

  const flyToMyLocation = useCallback(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoHint("Location is not supported in this browser");
      return;
    }
    setGeoHint(null);
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const { longitude, latitude, accuracy } = pos.coords;
        const acc = accuracy ?? 400;
        const zoomBoost =
          acc > 1000 ? 9 : acc > 300 ? 10.5 : acc > 80 ? 12 : 13.5;
        map.flyTo({
          center: [longitude, latitude] as LngLatLike,
          zoom: Math.max(map.getZoom(), zoomBoost),
          duration: 900,
          essential: true,
        });
      },
      (err) => {
        setGeoLocating(false);
        const code = (err as GeolocationPositionError).code;
        const msg =
          code === 1
            ? "Location permission denied"
            : code === 2
              ? "Position unavailable"
              : code === 3
                ? "Location request timed out"
                : "Could not get your location";
        setGeoHint(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30_000,
      },
    );
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || !showPressureHeatmap) return;
    let raf = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const map = mapRef.current?.getMap();
      if (
        map?.getLayer("heatmap-pressure-demand") &&
        map.getLayer("heatmap-pressure-supply")
      ) {
        const t = performance.now() / 1000;
        const pulse = Math.sin(
          (t * 2 * Math.PI * 1000) / HEATMAP_PULSE_PERIOD_MS,
        );
        const scale = 1 + HEATMAP_PULSE_AMPLITUDE * pulse;
        try {
          map.setPaintProperty(
            "heatmap-pressure-demand",
            "heatmap-radius",
            HEATMAP_BASE_RADIUS_DEMAND * scale,
          );
          map.setPaintProperty(
            "heatmap-pressure-demand",
            "heatmap-intensity",
            HEATMAP_INTENSITY_DEMAND_BASE + 0.18 * pulse,
          );
          map.setPaintProperty(
            "heatmap-pressure-supply",
            "heatmap-radius",
            HEATMAP_BASE_RADIUS_SUPPLY * scale,
          );
          map.setPaintProperty(
            "heatmap-pressure-supply",
            "heatmap-intensity",
            HEATMAP_INTENSITY_SUPPLY_BASE + 0.16 * pulse,
          );
        } catch {
          /* style swapping / layer not ready */
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [mapReady, showPressureHeatmap]);

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
        onLoad={() => {
          setMapReady(true);
          queueMicrotask(() => {
            syncViewportBounds();
            const map = mapRef.current?.getMap();
            if (map?.isStyleLoaded()) {
              ensureDemoWeatherMapImages(map);
            }
          });
        }}
        onMoveEnd={() => syncViewportBounds()}
        scrollZoom={{ around: "center" }}
      >
        <AttributionControl compact position="bottom-left" />
        <NavigationControl position="top-right" showCompass={false} />
        {showWeatherOverlay && effectiveOwmKey && owmCloudTiles.length > 0 ? (
          <Source
            key={
              openWeatherMap2TilesWork
                ? `owm-cl-m2-${weatherMapDateSecUtc}`
                : "owm-cl-v1"
            }
            id="owm-cloud-cover"
            type="raster"
            tileSize={256}
            tiles={owmCloudTiles}
            attribution='© <a href="https://openweathermap.org/" target="_blank" rel="noreferrer">OpenWeather</a>'
          >
            <Layer
              id="owm-cloud-cover-layer"
              type="raster"
              paint={{
                "raster-opacity": 0.4,
                "raster-fade-duration": 0,
              }}
            />
          </Source>
        ) : null}
        {showWeatherOverlay && effectiveOwmKey && owmPrecipTiles.length > 0 ? (
          <Source
            key={
              openWeatherMap2TilesWork
                ? `owm-pr-m2-${weatherMapDateSecUtc}`
                : "owm-pr-v1"
            }
            id="owm-precipitation"
            type="raster"
            tileSize={256}
            tiles={owmPrecipTiles}
          >
            <Layer
              id="owm-precipitation-layer"
              type="raster"
              paint={{
                "raster-opacity": 0.48,
                "raster-fade-duration": 0,
              }}
            />
          </Source>
        ) : null}
        {showWeatherOverlay ? (
          <Source
            id="demo-weather-icons"
            type="geojson"
            data={demoWeatherIconCollection}
          >
            <Layer
              id="demo-weather-symbol"
              type="symbol"
              layout={{
                "icon-image": [
                  "match",
                  ["get", "kind"],
                  "rain",
                  DEMO_WEATHER_ICON_RAIN,
                  "wind",
                  DEMO_WEATHER_ICON_WIND,
                  DEMO_WEATHER_ICON_RAIN,
                ],
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  4,
                  0.34,
                  5.85,
                  0.5,
                  8,
                  0.64,
                  10,
                  0.76,
                ],
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-anchor": "center",
                "icon-pitch-alignment": "viewport",
              }}
              paint={{
                "icon-opacity": ["to-number", ["get", "opacity"]],
              }}
            />
          </Source>
        ) : null}
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

        {showPressureHeatmap ? (
          <Source
            id="dispatch-pressure-heatmap"
            type="geojson"
            data={pressureHeatmapGeoJSON}
          >
            {/* Supply first, demand on top — red “pressure” stays visible where both overlap */}
            <Layer
              id="heatmap-pressure-supply"
              type="heatmap"
              filter={["==", ["get", "kind"], "supply"]}
              paint={{
                "heatmap-weight": [
                  "min",
                  1,
                  ["*", 4, ["get", "w"]],
                ],
                "heatmap-intensity": HEATMAP_INTENSITY_SUPPLY_BASE,
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(0,0,0,0)",
                  0.02,
                  "rgba(165,230,254,0.42)",
                  0.12,
                  "rgba(56,189,248,0.68)",
                  0.4,
                  "rgba(14,165,233,0.82)",
                  0.72,
                  "rgba(2,132,199,0.88)",
                  1,
                  "rgba(3,105,161,0.92)",
                ],
                "heatmap-radius": HEATMAP_BASE_RADIUS_SUPPLY,
                "heatmap-opacity": 0.74,
              }}
            />
            <Layer
              id="heatmap-pressure-demand"
              type="heatmap"
              filter={["==", ["get", "kind"], "demand"]}
              paint={{
                "heatmap-weight": [
                  "min",
                  1,
                  ["*", 4, ["get", "w"]],
                ],
                "heatmap-intensity": HEATMAP_INTENSITY_DEMAND_BASE,
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(0,0,0,0)",
                  0.02,
                  "rgba(255,200,140,0.45)",
                  0.12,
                  "rgba(255,150,90,0.65)",
                  0.35,
                  "rgba(234,88,52,0.78)",
                  0.65,
                  "rgba(220,60,40,0.88)",
                  1,
                  "rgba(185,28,28,0.92)",
                ],
                "heatmap-radius": HEATMAP_BASE_RADIUS_DEMAND,
                "heatmap-opacity": 0.78,
              }}
            />
          </Source>
        ) : null}

        {showLoadNodes
          ? openLoads.map((load) => {
              const ll = svgToLngLat(load.pickupX, load.pickupY);
              const active = selectedLoad?.id === load.id;
              const inboxHover =
                showLoadNodes && hoveredLoadId === load.id;
              return (
                <Marker
                  key={`load-${load.id}`}
                  longitude={ll.lng}
                  latitude={ll.lat}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    if (Date.now() < suppressClickUntil.current) return;
                    selectLoad(load.id);
                  }}
                >
                  <LoadMarkerContent
                    load={load}
                    active={active}
                    inboxHover={inboxHover}
                  />
                </Marker>
              );
            })
          : null}

        {driversOnMap.map((driver) => {
          const ll = svgToLngLat(driver.x, driver.y);
          const hasSelection = !!selectedLoad;
          const isTop = top5Ids.includes(driver.id);
          const candidatesOnlyView = hasSelection && !showAllDrivers;
          const ringBrowseMode = !selectedLoad && state.mapRingFilter != null;
          const dimmed = ringBrowseMode
            ? false
            : hasSelection && !candidatesOnlyView && !isTop;
          const isHovered = hoveredDriverId === driver.id;
          const r = rankedById.get(driver.id);
          const canDrag =
            !!selectedLoad && isTop && rankedAllowsAssignment(r);
          const rankForLoad =
            selectedLoad != null
              ? (rankByDriverId.get(driver.id) ?? null)
              : null;
          const fadedBySelection =
            !!state.selectedDriverId &&
            state.selectedDriverId !== driver.id &&
            (!!selectedLoad || ringBrowseMode);
          const isCandidate = ringBrowseMode
            ? state.selectedDriverId === driver.id
            : candidatesOnlyView || isTop;

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
                  isCandidate={isCandidate}
                  isHovered={isHovered}
                  fadedBySelection={fadedBySelection}
                  ranked={r}
                  dragging={draggingDriverId === driver.id}
                  rankForLoad={rankForLoad}
                  loadPickMode={hasSelection}
                />
              </div>
            </Marker>
          );
        })}

        {selectedLoad && pickupLngLat && !showLoadNodes && (
          <Marker
            longitude={pickupLngLat.lng}
            latitude={pickupLngLat.lat}
            anchor="center"
          >
            <div
              className="pointer-events-none relative flex h-12 w-12 items-center justify-center"
              role="img"
              aria-label="Pickup location"
            >
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
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-amber-500/45 bg-gradient-to-b from-zinc-50 to-zinc-200 shadow-[0_4px_16px_rgba(245,158,11,0.4),inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-amber-400/40 dark:from-zinc-800 dark:to-zinc-950 dark:shadow-[0_6px_20px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
                <PickupOriginIcon className="h-8 w-8 shrink-0 drop-shadow-sm" />
              </div>
            </div>
          </Marker>
        )}
      </MapGL>

      <div className="pointer-events-auto absolute right-2.5 top-[78px] z-30 flex flex-col items-end gap-1.5">
        <button
          type="button"
          disabled={!mapReady || geoLocating}
          onClick={flyToMyLocation}
          title="Center map on your current location"
          aria-label="Center map on your current location"
          className="flex size-9 items-center justify-center rounded-md border border-black/10 bg-white/95 text-sky-600 shadow-md backdrop-blur-sm transition-colors hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-zinc-900/95 dark:text-sky-400 dark:hover:bg-zinc-800 dark:hover:text-sky-300"
        >
          <LocateMeIcon
            className={
              geoLocating ? "h-5 w-5 animate-pulse" : "h-5 w-5"
            }
          />
        </button>
        {geoHint ? (
          <p
            role="status"
            className="pointer-events-none max-w-[min(220px,calc(100vw-6rem))] rounded-md border border-red-500/25 bg-white/95 px-2 py-1.5 text-left text-[10px] font-medium leading-snug text-red-800 shadow-sm dark:bg-zinc-900/95 dark:text-red-200"
          >
            {geoHint}
          </p>
        ) : null}
      </div>

      <div className="pointer-events-none absolute left-3 top-3 max-w-[min(100%,min(260px,calc(100vw-8rem)))] rounded-lg border border-black/10 bg-white/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600 backdrop-blur-sm dark:border-white/[0.06] dark:bg-black/50 dark:text-zinc-500">
        {selectedLoad
          ? "Mapbox · Drag a top driver onto the amber pickup pin to assign"
          : state.mapRingFilter
            ? "Mapbox · Fleet ring browse — use arrows in the driver panel or tap trucks"
            : "Mapbox · Tap trucks, load pins, or a fleet alert to view details"}
      </div>

      <div className="pointer-events-auto absolute bottom-12 left-2 z-20 flex max-w-[min(calc(100%-1rem),260px)] flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/95 p-2 text-[11px] text-zinc-800 shadow-lg backdrop-blur-md dark:text-zinc-200">
        <button
          type="button"
          id="map-controls-toggle"
          aria-expanded={mapControlsOpen}
          aria-controls="map-controls-drawer"
          onClick={() => setMapControlsOpen((o) => !o)}
          title={mapControlsOpen ? "Hide map controls" : "Show map controls"}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left outline-none transition-colors hover:bg-[var(--surface-1)]/80 focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Map controls
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${mapControlsOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 7.5 10 12.5 15 7.5" />
          </svg>
        </button>
        {mapControlsOpen ? (
          <div
            id="map-controls-drawer"
            role="region"
            aria-labelledby="map-controls-toggle"
            className="flex flex-col gap-2"
          >
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
        <label className="flex cursor-pointer select-none items-start gap-2 rounded-lg px-0.5 py-1 hover:bg-[var(--surface-1)]/80">
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 shrink-0 rounded border-zinc-400 bg-white text-amber-500 accent-amber-500 dark:border-zinc-500 dark:bg-zinc-800"
            checked={showLoadNodes}
            onChange={(e) => setShowLoadNodes(e.target.checked)}
          />
          <span className="leading-snug">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Load pins
            </span>
            <span className="mt-0.5 block text-[10px] font-normal text-zinc-600 dark:text-zinc-500">
              Open loads at pickup; click for details
            </span>
          </span>
        </label>
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
        <label className="flex cursor-pointer select-none items-start gap-2 rounded-lg border-t border-[var(--border)] px-0.5 pt-2 hover:bg-[var(--surface-1)]/80">
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 shrink-0 rounded border-zinc-400 bg-white text-rose-500 accent-rose-500 dark:border-zinc-500 dark:bg-zinc-800"
            checked={showPressureHeatmap}
            onChange={(e) => setShowPressureHeatmap(e.target.checked)}
          />
          <span className="leading-snug">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Heatmap
            </span>
            <span className="mt-0.5 block text-[10px] font-normal text-zinc-600 dark:text-zinc-500">
              Demand (red) vs idle capacity (blue); follows timeline scrub
            </span>
          </span>
        </label>
        <div className="border-t border-[var(--border)] pt-2">
          <button
            type="button"
            aria-pressed={showWeatherOverlay}
            aria-label={
              severeWeatherInView
                ? "Weather overlay. Adverse conditions possible in the visible map area for the scrubbed time."
                : undefined
            }
            title={
              severeWeatherInView
                ? "Adverse weather possible in view for the scrubbed time — click to toggle overlay"
                : showWeatherOverlay
                  ? "Hide weather overlay"
                  : effectiveOwmKey
                    ? openWeatherMap2TilesWork
                      ? "Show demo weather icons + OpenWeather forecast raster"
                      : "Show demo weather icons + OpenWeather current raster"
                    : openWeatherKeyRejected
                      ? "Show demo weather (local). OpenWeather key invalid — raster off."
                      : "Show demo weather (local). Add key for optional raster below."
            }
            onClick={() => setShowWeatherOverlay((v) => !v)}
            className={`relative w-full rounded-lg px-2 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] ${
              showWeatherOverlay
                ? "bg-sky-500/15 ring-1 ring-sky-500/35 dark:bg-sky-500/20"
                : "hover:bg-[var(--surface-1)]/80"
            }`}
          >
            {severeWeatherInView ? (
              <span
                className="pointer-events-none absolute right-2 top-2 size-2.5 rounded-full bg-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.45)]"
                aria-hidden
              />
            ) : null}
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Overlay
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
              Weather
            </span>
            <span className="mt-1 block text-[10px] font-normal leading-snug text-zinc-600 dark:text-zinc-500">
              Demo weather icons (scrub 0–24h). Max opacity 0.3.
              {effectiveOwmKey
                ? " OWM raster stacks underneath."
                : ""}
            </span>
          </button>
        </div>
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
                Off = top 5 assignable + rank
              </span>
            </span>
          </label>
        )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
