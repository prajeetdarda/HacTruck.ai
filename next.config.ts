import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Map tiles load in the browser; expose key from server-style `OPENWEATHER_API_KEY`. */
  env: {
    NEXT_PUBLIC_OPENWEATHER_API_KEY:
      process.env.OPENWEATHER_API_KEY ??
      process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY ??
      "",
  },
  turbopack: {
    root: turbopackRoot,
  },
  transpilePackages: ["mapbox-gl", "@vis.gl/react-mapbox"],
  /** Webpack dev (`npm run dev`) — lighter file-watching on some machines than default Turbopack. */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
