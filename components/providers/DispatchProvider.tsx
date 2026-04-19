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
import { buildProactiveAlerts } from "@/lib/alerts";
import { useNow } from "@/hooks/useNow";
import { DRIVERS, LOADS } from "@/lib/mock-data";
import { pickBestAssignable, rankDriversForLoad } from "@/lib/scoring";
import { driverForSimulation } from "@/lib/simulation";
import type { Driver, ProactiveAlert, RankedDriver, ToastState } from "@/lib/types";

type State = {
  selectedLoadId: string | null;
  selectedDriverId: string | null;
  simulatedHoursOffset: number;
  assignments: Record<string, string>;
  toast: ToastState;
  confirmedAssign: { loadId: string; driverId: string } | null;
  pendingUndo: { loadId: string; driverId: string } | null;
  /** When no load is selected: filter map to this ring status (null = all). */
  mapRingFilter: Driver["ringStatus"] | null;
  mapRingFilterPage: number;
};

type Action =
  | { type: "selectLoad"; id: string | null }
  | { type: "selectDriver"; id: string | null }
  | { type: "setSimOffset"; hours: number }
  | {
      type: "setMapRingFilter";
      ring: Driver["ringStatus"];
      /** When turning a filter on: first driver in browse order (id sort). */
      initialSelectedDriverId?: string | null;
    }
  | { type: "mapRingFilterPageDelta"; delta: number; maxPage: number }
  | { type: "setMapRingFilterPage"; page: number }
  | {
      type: "assign";
      loadId: string;
      driverId: string;
      driverName: string;
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
        selectedDriverId: null,
        confirmedAssign: null,
        ...(action.id != null
          ? { mapRingFilter: null as Driver["ringStatus"] | null, mapRingFilterPage: 0 }
          : {}),
      };
    case "selectDriver":
      if (state.selectedDriverId === action.id) return state;
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
    case "setMapRingFilterPage":
      if (state.mapRingFilterPage === action.page) return state;
      return { ...state, mapRingFilterPage: action.page };
    case "mapRingFilterPageDelta": {
      if (!state.mapRingFilter) return state;
      const next = Math.max(
        0,
        Math.min(state.mapRingFilterPage + action.delta, action.maxPage),
      );
      if (next === state.mapRingFilterPage) return state;
      return { ...state, mapRingFilterPage: next };
    }
    case "assign": {
      const nextAssignments = {
        ...state.assignments,
        [action.loadId]: action.driverId,
      };
      const nextLoad = pickNextUrgentLoadId(nextAssignments);
      return {
        ...state,
        assignments: nextAssignments,
        confirmedAssign: { loadId: action.loadId, driverId: action.driverId },
        selectedLoadId: nextLoad,
        selectedDriverId: null,
        pendingUndo: { loadId: action.loadId, driverId: action.driverId },
        toast: {
          id: crypto.randomUUID(),
          message: `Assigned ${action.driverName}`,
          sub: `Load ${action.loadId} covered`,
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
  const nowMs = useNow(2500);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [loadInboxExpanded, setLoadInboxExpanded] = useState(false);

  const openLoadInbox = useCallback(() => setLoadInboxExpanded(true), []);

  const [state, dispatch] = useReducer(reducer, {
    selectedLoadId: null,
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

  const bestAssignable = useMemo(
    () => (ranked.length ? pickBestAssignable(ranked) : null),
    [ranked],
  );

  const top5Ids = useMemo(
    () => ranked.slice(0, 5).map((r) => r.driver.id),
    [ranked],
  );

  const openLoads = useMemo(
    () => LOADS.filter((l) => !state.assignments[l.id]),
    [state.assignments],
  );

  const proactiveAlertsRaw: ProactiveAlert[] = useMemo(
    () =>
      buildProactiveAlerts({
        drivers: driversSimulated,
        openLoads,
        nowMs,
        offsetHours: state.simulatedHoursOffset,
      }),
    [driversSimulated, openLoads, nowMs, state.simulatedHoursOffset],
  );

  const proactiveAlerts: ProactiveAlert[] = useMemo(
    () => proactiveAlertsRaw.filter((a) => !dismissedAlertIds.includes(a.id)),
    [proactiveAlertsRaw, dismissedAlertIds],
  );

  const activeDriverCount = useMemo(() => {
    return DRIVERS.filter(
      (d) => d.ringStatus === "available" || d.ringStatus === "en_route",
    ).length;
  }, []);

  const selectLoad = useCallback((id: string | null) => {
    dispatch({ type: "selectLoad", id });
  }, []);

  const selectDriver = useCallback((id: string | null) => {
    dispatch({ type: "selectDriver", id });
  }, []);

  const setSimulatedHoursOffset = useCallback((hours: number) => {
    dispatch({ type: "setSimOffset", hours });
  }, []);

  const assign = useCallback(
    (loadId: string, driverId: string, driverName: string) => {
      dispatch({ type: "assign", loadId, driverId, driverName });
    },
    [],
  );

  const assignBestForSelectedLoad = useCallback(() => {
    if (!selectedLoad || !bestAssignable) return;
    assign(selectedLoad.id, bestAssignable.driver.id, bestAssignable.driver.name);
  }, [assign, bestAssignable, selectedLoad]);

  const dismissAlert = useCallback((id: string) => {
    setDismissedAlertIds((prev) =>
      prev.includes(id) ? prev : [...prev, id],
    );
  }, []);

  const clearDismissedAlerts = useCallback(() => {
    setDismissedAlertIds([]);
  }, []);

  const dismissToast = useCallback(() => {
    dispatch({ type: "dismissToast" });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const setMapRingFilter = useCallback(
    (ring: Driver["ringStatus"]) => {
      if (state.mapRingFilter === ring) {
        dispatch({ type: "setMapRingFilter", ring });
        return;
      }
      const sorted = driversSimulated
        .filter((d) => d.ringStatus === ring)
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
      const n = driversSimulated.filter(
        (d) => d.ringStatus === state.mapRingFilter,
      ).length;
      const maxPage = Math.max(0, n - 1);
      dispatch({ type: "mapRingFilterPageDelta", delta, maxPage });
    },
    [driversSimulated, state.mapRingFilter],
  );

  const setMapRingBrowsePage = useCallback((page: number) => {
    dispatch({ type: "setMapRingFilterPage", page });
  }, []);

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
    }, 3000);
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
      bestAssignable,
      proactiveAlerts,
      top5Ids,
      openLoads,
      activeDriverCount,
      selectLoad,
      selectDriver,
      setSimulatedHoursOffset,
      assign,
      assignBestForSelectedLoad,
      dismissAlert,
      clearDismissedAlerts,
      dismissToast,
      undo,
      setMapRingFilter,
      bumpMapRingFilterPage,
      setMapRingBrowsePage,
      loadsAll: LOADS,
      driversBase: DRIVERS,
      loadInboxExpanded,
      setLoadInboxExpanded,
      openLoadInbox,
    }),
    [
      state,
      dispatch,
      selectedLoad,
      driversSimulated,
      ranked,
      bestAssignable,
      proactiveAlerts,
      top5Ids,
      openLoads,
      activeDriverCount,
      selectLoad,
      selectDriver,
      setSimulatedHoursOffset,
      assign,
      assignBestForSelectedLoad,
      dismissAlert,
      clearDismissedAlerts,
      dismissToast,
      undo,
      setMapRingFilter,
      bumpMapRingFilterPage,
      setMapRingBrowsePage,
      loadInboxExpanded,
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
