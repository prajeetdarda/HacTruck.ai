# HackTruck

Next.js app for fleet dispatch on a Mapbox map: loads, drivers, weather overlays, and AI-assisted load matching.

## Stack

- **Next.js** 16 (App Router), **React** 19, **TypeScript**
- **Tailwind CSS** 4
- **mapbox-gl** / **react-map-gl** for the map
- **OpenWeather** for current weather and optional Maps 2.0 forecast tiles (timeline scrub)
- **OpenAI** for top driver matches (`POST /api/match-load`)

## Prerequisites

- Node.js 20+ (matches `@types/node` in the repo)
- npm (or another package manager)

## Setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables and fill in secrets:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Purpose |
   |----------|---------|
   | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox public token ([Mapbox access tokens](https://account.mapbox.com/access-tokens/)) |
   | `OPENWEATHER_API_KEY` | OpenWeather 2.5 + optional Maps 2.0 tiles; restart dev after changes |
   | `OPENAI_API_KEY` | Server-only; used for match-load. Optional: `OPENAI_MODEL` (default `gpt-4o-mini`) |

3. Start the dev server (webpack mode, as configured in `package.json`):

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (`next dev --webpack`) |
| `npm run dev:turbo` | Development with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## API routes (overview)

- `GET /api/health` — health check
- `GET /api/fleet` — fleet data
- `POST /api/directions` — routing
- `POST /api/assign` — assignment
- `POST /api/match-load` — OpenAI driver matching
- `GET /api/weather/severity` — weather severity
- Fixture routes under `app/api/fixtures/` for local/demo data

## Deploy

Compatible with Vercel or any host that supports Next.js; set the same env vars in the host dashboard. See [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying).

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
