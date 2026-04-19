import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
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
