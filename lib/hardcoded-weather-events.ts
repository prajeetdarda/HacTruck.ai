/**
 * Demo-only weather: no APIs. Hours match the timeline scrubber (0–24h).
 */

export type WeatherMotionKeyframe = {
  hourFromNow: number;
  deltaLng: number;
  deltaLat: number;
};

export type HardcodedWeatherEvent = {
  id: string;
  kind: "rain" | "wind";
  startHour: number;
  endHour: number;
  fadeEdgeHours: number;
  centerLng: number;
  centerLat: number;
  motionKeyframes: WeatherMotionKeyframe[];
};

/** Five cells across 0–24h; centers over AZ for default map view. */
export const HARDCODED_WEATHER_EVENTS: HardcodedWeatherEvent[] = [
  {
    id: "rain-phx-corridor",
    kind: "rain",
    startHour: 0.25,
    endHour: 7.5,
    fadeEdgeHours: 0.45,
    centerLng: -111.5,
    centerLat: 33.4,
    motionKeyframes: [
      { hourFromNow: 0, deltaLng: 0, deltaLat: 0 },
      { hourFromNow: 3.5, deltaLng: 0.14, deltaLat: -0.05 },
      { hourFromNow: 7.5, deltaLng: 0.22, deltaLat: 0.04 },
    ],
  },
  {
    id: "rain-tucson-south",
    kind: "rain",
    startHour: 2,
    endHour: 11,
    fadeEdgeHours: 0.5,
    centerLng: -110.85,
    centerLat: 31.95,
    motionKeyframes: [
      { hourFromNow: 2, deltaLng: 0, deltaLat: 0 },
      { hourFromNow: 6, deltaLng: -0.1, deltaLat: 0.07 },
      { hourFromNow: 11, deltaLng: 0.06, deltaLat: 0.12 },
    ],
  },
  {
    id: "wind-flagstaff",
    kind: "wind",
    startHour: 4,
    endHour: 13,
    fadeEdgeHours: 0.55,
    centerLng: -111.6,
    centerLat: 34.95,
    motionKeyframes: [
      { hourFromNow: 4, deltaLng: 0, deltaLat: 0 },
      { hourFromNow: 8.5, deltaLng: 0.11, deltaLat: -0.06 },
      { hourFromNow: 13, deltaLng: -0.05, deltaLat: 0.09 },
    ],
  },
  {
    id: "rain-yuma-west",
    kind: "rain",
    startHour: 7,
    endHour: 18,
    fadeEdgeHours: 0.6,
    centerLng: -114.3,
    centerLat: 32.75,
    motionKeyframes: [
      { hourFromNow: 7, deltaLng: 0, deltaLat: 0 },
      { hourFromNow: 12, deltaLng: 0.18, deltaLat: 0.03 },
      { hourFromNow: 18, deltaLng: 0.05, deltaLat: -0.08 },
    ],
  },
  {
    id: "wind-east-az",
    kind: "wind",
    startHour: 13.5,
    endHour: 24,
    fadeEdgeHours: 0.55,
    centerLng: -109.95,
    centerLat: 33.85,
    motionKeyframes: [
      { hourFromNow: 13.5, deltaLng: 0, deltaLat: 0 },
      { hourFromNow: 18, deltaLng: -0.12, deltaLat: 0.05 },
      { hourFromNow: 24, deltaLng: 0.08, deltaLat: -0.04 },
    ],
  },
];
