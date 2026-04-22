"use client";

import { useEffect, useState } from "react";
import { DB_NOW_MS } from "@/lib/backend-db";

/**
 * Returns a demo-relative timestamp that starts at DB_NOW_MS (the scenario's
 * "now") and ticks forward in real time. This keeps countdowns accurate
 * regardless of the actual calendar date the app is opened.
 */
const WALL_CLOCK_AT_MOUNT = Date.now();

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => DB_NOW_MS + (Date.now() - WALL_CLOCK_AT_MOUNT));
  useEffect(() => {
    const t = setInterval(
      () => setNow(DB_NOW_MS + (Date.now() - WALL_CLOCK_AT_MOUNT)),
      intervalMs,
    );
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
