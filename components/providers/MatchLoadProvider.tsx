"use client";

import {
  createContext,
  startTransition,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useDispatchContext } from "@/components/providers/DispatchProvider";

export type LlmTopRow = { rank: number; driverId: string; reasoning: string };

export type MatchLoadResult = {
  source: "llm" | "heuristic";
  top3: LlmTopRow[];
  error?: string;
};

type MatchApiResponse = {
  source?: "llm" | "heuristic";
  top3?: LlmTopRow[];
  error?: string;
};

export type MatchLoadContextValue =
  | { status: "idle"; loadId: null; result: null }
  | { status: "loading"; loadId: string; result: null }
  | { status: "ready"; loadId: string; result: MatchLoadResult };

const Ctx = createContext<MatchLoadContextValue | null>(null);

export function MatchLoadProvider({ children }: { children: React.ReactNode }) {
  const { state } = useDispatchContext();
  const loadId = state.selectedLoadId;
  const runMatch = state.loadSelectSource === "inbox";

  const [match, setMatch] = useState<MatchLoadContextValue>({
    status: "idle",
    loadId: null,
    result: null,
  });

  useLayoutEffect(() => {
    if (!loadId) {
      startTransition(() =>
        setMatch({ status: "idle", loadId: null, result: null }),
      );
      return;
    }
    if (!runMatch) {
      startTransition(() =>
        setMatch({ status: "idle", loadId: null, result: null }),
      );
      return;
    }

    const ac = new AbortController();
    startTransition(() =>
      setMatch({ status: "loading", loadId, result: null }),
    );

    fetch("/api/match-load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadId }),
      signal: ac.signal,
    })
      .then((r) => r.json() as Promise<MatchApiResponse>)
      .then((data) => {
        setMatch({
          status: "ready",
          loadId,
          result: {
            source: data.source === "llm" ? "llm" : "heuristic",
            top3: Array.isArray(data.top3) ? data.top3 : [],
            error: data.error,
          },
        });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMatch({
          status: "ready",
          loadId,
          result: {
            source: "heuristic",
            top3: [],
            error: "Request failed",
          },
        });
      });

    return () => ac.abort();
  }, [loadId, runMatch]);

  const value = useMemo(() => match, [match]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMatchLoad(): MatchLoadContextValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useMatchLoad requires MatchLoadProvider");
  }
  return v;
}
