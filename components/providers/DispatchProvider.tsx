"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { DRIVERS, LOADS } from "@/lib/backend-db";
import { rankDriversForLoad, rankedAllowsAssignment } from "@/lib/scoring";
import { driverForSimulation } from "@/lib/simulation";
import { formatEquipment } from "@/lib/format";
import {
  ASSIGN_UNDO_TOAST_MS,
  fleetSummaryRing,
  type Driver,
  type FleetSummaryRing,
  type RankedDriver,
  type ToastState,
} from "@/lib/types";

/** Inbox selection runs LLM match + tray; map load-pin is details-only. */
export type LoadSelectSource = "inbox" | "map_pin";

type State = {
  selectedLoadId: string | null;
  /** How the current load was chosen — drives match-load / LLM UI. */
  loadSelectSource: LoadSelectSource | null;
  selectedDriverId: string | null;
  simulatedHoursOffset: number;
  assignments: Record<string, string>;
  toast: ToastState;
  confirmedAssign: { loadId: string; driverId: string } | null;
  pendingUndo: { loadId: string; driverId: string } | null;
  /** When no load is selected: filter map to this summary ring (null = all). */
  mapRingFilter: FleetSummaryRing | null;
  mapRingFilterPage: number;
};

type Action =
  | {
      type: "selectLoad";
      id: string | null;
      /** Defaults to inbox when picking a load (sidebar / assign flow). */
      source?: LoadSelectSource;
    }
  | { type: "selectDriver"; id: string | null }
  | { type: "setSimOffset"; hours: number }
  | {
      type: "setMapRingFilter";
      ring: FleetSummaryRing;
      /** When turning a filter on: first driver in browse order (id sort). */
      initialSelectedDriverId?: string | null;
    }
  | {
      type: "setMapRingBrowseIndex";
      page: number;
      selectedDriverId: string | null;
    }
  | { type: "exitRingBrowseSelectDriver"; id: string }
  | {
      type: "assign";
      loadId: string;
      driverId: string;
      driverName: string;
      matchPercent?: number;
    }
  | { type: "undo" }
  | { type: "dismissToast" }
  | { type: "clearConfirmed" };

function pickNextUrgentLoadId(assignments: Record<string, string>): string | null {
  const open = LOADS.filter((l) => !assignments[l.id]).sort(
    (a, b) => a.pickupDeadline - b.pickupDeadline,
  );
  return open[0]?.id ?? null;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "selectLoad":
      return {
        ...state,
        selectedLoadId: action.id,
        loadSelectSource:
          action.id === null
            ? null
            : (action.source ?? "inbox"),
        selectedDriverId: null,
        confirmedAssign: null,
        /** Browse / ring UI is not used in no-load map mode — always reset. */
        mapRingFilter: null,
        mapRingFilterPage: 0,
      };
    case "selectDriver":
      if (state.selectedDriverId === action.id) return state;
      if (action.id === null) {
        return {
          ...state,
          selectedDriverId: null,
          mapRingFilter: null,
          mapRingFilterPage: 0,
        };
      }
      return { ...state, selectedDriverId: action.id };
    case "setSimOffset":
      return { ...state, simulatedHoursOffset: action.hours };
    case "setMapRingFilter": {
      if (state.mapRingFilter === action.ring) {
        return {
          ...state,
          mapRingFilter: null,
          mapRingFilterPage: 0,
          selectedDriverId: null,
        };
      }
      return {
        ...state,
        mapRingFilter: action.ring,
        mapRingFilterPage: 0,
        selectedDriverId: action.initialSelectedDriverId ?? null,
      };
    }
    case "setMapRingBrowseIndex": {
      if (!state.mapRingFilter) return state;
      if (
        state.mapRingFilterPage === action.page &&
        state.selectedDriverId === action.selectedDriverId
      ) {
        return state;
      }
      return {
        ...state,
        mapRingFilterPage: action.page,
        selectedDriverId: action.selectedDriverId,
      };
    }
    case "exitRingBrowseSelectDriver":
      return {
        ...state,
        mapRingFilter: null,
        mapRingFilterPage: 0,
        selectedDriverId: action.id,
      };
    case "assign": {
      const nextAssignments = {
        ...state.assignments,
        [action.loadId]: action.driverId,
      };
      const nextLoad = pickNextUrgentLoadId(nextAssignments);
      const load = LOADS.find((l) => l.id === action.loadId);
      const driver = DRIVERS.find((d) => d.id === action.driverId);
      const summary =
        load && driver
          ? {
              loadId: load.id,
              loadRoute: `${load.origin} → ${load.destination}`,
              loadEquipment: load.equipment,
              driverName: driver.name,
              driverInitials: driver.initials,
              truckLabel: driver.truckLabel,
              matchPercent: action.matchPercent,
            }
          : undefined;
      const sub =
        load && driver
          ? `${load.id} · ${formatEquipment(load.equipment)}`
          : `Load ${action.loadId} covered`;
      return {
        ...state,
        assignments: nextAssignments,
        confirmedAssign: { loadId: action.loadId, driverId: action.driverId },
        selectedLoadId: nextLoad,
        loadSelectSource: nextLoad ? "inbox" : null,
        selectedDriverId: null,
        pendingUndo: { loadId: action.loadId, driverId: action.driverId },
        toast: {
          id: crypto.randomUUID(),
          message: `Assigned ${action.driverName}`,
          sub,
          summary,
          undoDeadlineMs: Date.now() + ASSIGN_UNDO_TOAST_MS,
        },
      };
    }
    case "undo": {
      const p = state.pendingUndo;
      if (!p) return state;
      const rest = { ...state.assignments };
      delete rest[p.loadId];
      return {
        ...state,
        assignments: rest,
        selectedLoadId: p.loadId,
        loadSelectSource: "inbox",
        selectedDriverId: null,
        confirmedAssign: null,
        pendingUndo: null,
        toast: null,
      };
    }
    case "dismissToast":
      return {
        ...state,
        toast: null,
        pendingUndo: null,
        confirmedAssign: null,
      };
    case "clearConfirmed":
      return { ...state, confirmedAssign: null };
    default:
      return state;
  }
}

const Ctx = createContext<ReturnType<typeof useDispatchValue> | null>(null);

function useDispatchValue() {
  const [loadInboxExpanded, setLoadInboxExpanded] = useState(false);
  /** Map "Load pins" layer — synced with load inbox engagement. */
  const [loadPinsOnMap, setLoadPinsOnMap] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    selectedLoadId: null,
    loadSelectSource: null,
    selectedDriverId: null,
    simulatedHoursOffset: 0,
    assignments: {},
    toast: null,
    confirmedAssign: null,
    pendingUndo: null,
    mapRingFilter: null,
    mapRingFilterPage: 0,
  } satisfies State);

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedLoad = useMemo(
    () => LOADS.find((l) => l.id === state.selectedLoadId) ?? null,
    [state.selectedLoadId],
  );

  const driversSimulated: Driver[] = useMemo(
    () =>
      DRIVERS.map((d) =>
        driverForSimulation(d, selectedLoad, state.simulatedHoursOffset),
      ),
    [selectedLoad, state.simulatedHoursOffset],
  );

  const ranked: RankedDriver[] = useMemo(() => {
    if (!selectedLoad) return [];
    return rankDriversForLoad(selectedLoad, driversSimulated);
  }, [selectedLoad, driversSimulated]);

  const top5Ids = useMemo(
    () =>
      ranked
        .filter(rankedAllowsAssignment)
        .slice(0, 5)
        .map((r) => r.driver.id),
    [ranked],
  );

  const openLoads = useMemo(
    () => LOADS.filter((l) => !state.assignments[l.id]),
    [state.assignments],
  );

  const activeDriverCount = useMemo(() => {
    return DRIVERS.filter(
      (d) =>
        d.ringStatus !== "off_duty" && d.ringStatus !== "unavailable",
    ).length;
  }, []);

  const selectLoad = useCallback(
    (id: string | null, opts?: { source?: LoadSelectSource }) => {
      dispatch({ type: "selectLoad", id, source: opts?.source });
    },
    [],
  );

  const selectDriver = useCallback(
    (id: string | null) => {
      if (id == null) {
        dispatch({ type: "selectDriver", id: null });
        return;
      }
      if (state.mapRingFilter) {
        const sorted = driversSimulated
          .filter(
            (d) => fleetSummaryRing(d.ringStatus) === state.mapRingFilter,
          )
          .sort((a, b) => a.id.localeCompare(b.id));
        const inRing = sorted.some((d) => d.id === id);
        if (inRing) {
          const idx = sorted.findIndex((d) => d.id === id);
          dispatch({
            type: "setMapRingBrowseIndex",
            page: idx,
            selectedDriverId: id,
          });
          return;
        }
        dispatch({ type: "exitRingBrowseSelectDriver", id });
        return;
      }
      dispatch({ type: "selectDriver", id });
    },
    [state.mapRingFilter, driversSimulated],
  );

  const setSimulatedHoursOffset = useCallback((hours: number) => {
    dispatch({ type: "setSimOffset", hours });
  }, []);

  const assign = useCallback(
    (
      loadId: string,
      driverId: string,
      driverName: string,
      opts?: { matchPercent?: number },
    ) => {
      dispatch({
        type: "assign",
        loadId,
        driverId,
        driverName,
        matchPercent: opts?.matchPercent,
      });
    },
    [],
  );

  const dismissToast = useCallback(() => {
    dispatch({ type: "dismissToast" });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const setMapRingFilter = useCallback(
    (ring: FleetSummaryRing) => {
      if (state.mapRingFilter === ring) {
        dispatch({ type: "setMapRingFilter", ring });
        return;
      }
      const sorted = driversSimulated
        .filter((d) => fleetSummaryRing(d.ringStatus) === ring)
        .sort((a, b) => a.id.localeCompare(b.id));
      const initialSelectedDriverId = sorted[0]?.id ?? null;
      dispatch({
        type: "setMapRingFilter",
        ring,
        initialSelectedDriverId,
      });
    },
    [driversSimulated, state.mapRingFilter],
  );

  const bumpMapRingFilterPage = useCallback(
    (delta: number) => {
      if (state.mapRingFilter == null) return;
      const sorted = driversSimulated
        .filter(
          (d) => fleetSummaryRing(d.ringStatus) === state.mapRingFilter,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      const n = sorted.length;
      if (n === 0) return;
      const maxPage = n - 1;
      const nextPage = Math.max(
        0,
        Math.min(state.mapRingFilterPage + delta, maxPage),
      );
      if (nextPage === state.mapRingFilterPage) return;
      dispatch({
        type: "setMapRingBrowseIndex",
        page: nextPage,
        selectedDriverId: sorted[nextPage]!.id,
      });
    },
    [driversSimulated, state.mapRingFilter, state.mapRingFilterPage],
  );

  const setMapRingBrowsePage = useCallback(
    (page: number) => {
      if (state.mapRingFilter == null) return;
      const sorted = driversSimulated
        .filter(
          (d) => fleetSummaryRing(d.ringStatus) === state.mapRingFilter,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      const maxPage = Math.max(0, sorted.length - 1);
      const nextPage = Math.max(0, Math.min(page, maxPage));
      dispatch({
        type: "setMapRingBrowseIndex",
        page: nextPage,
        selectedDriverId: sorted[nextPage]?.id ?? null,
      });
    },
    [driversSimulated, state.mapRingFilter],
  );

  useEffect(() => {
    if (!state.toast) {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      return;
    }
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      dispatch({ type: "dismissToast" });
      undoTimerRef.current = null;
    }, ASSIGN_UNDO_TOAST_MS);
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [state.toast]);

  return useMemo(
    () => ({
      state,
      dispatch,
      selectedLoad,
      driversSimulated,
      ranked,
      top5Ids,
      openLoads,
      activeDriverCount,
      loadInboxExpanded,
      setLoadInboxExpanded,
      loadPinsOnMap,
      setLoadPinsOnMap,
      selectLoad,
      selectDriver,
      setSimulatedHoursOffset,
      assign,
      dismissToast,
      undo,
      setMapRingFilter,
      bumpMapRingFilterPage,
      setMapRingBrowsePage,
      loadsAll: LOADS,
      driversBase: DRIVERS,
    }),
    [
      state,
      dispatch,
      selectedLoad,
      driversSimulated,
      ranked,
      top5Ids,
      openLoads,
      activeDriverCount,
      loadInboxExpanded,
      loadPinsOnMap,
      selectLoad,
      selectDriver,
      setSimulatedHoursOffset,
      assign,
      dismissToast,
      undo,
      setMapRingFilter,
      bumpMapRingFilterPage,
      setMapRingBrowsePage,
    ],
  );
}

export function DispatchProvider({ children }: { children: React.ReactNode }) {
  const value = useDispatchValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDispatchContext() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDispatchContext needs DispatchProvider");
  return v;
}
