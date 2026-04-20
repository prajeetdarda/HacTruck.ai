# HacTruck — AI Fleet Dispatch Intelligence

> **Built at ASU GlobeHack 2026** — Marketplace & Growth Track, sponsored by Trucker Path  
> *April 18–20, 2026 · Arizona State University*

---

## The Problem

America's freight network — $800B+ industry — still runs on phone calls, paper, and spreadsheets. Small and mid-size fleets (5–50 trucks) are the backbone of that network, yet a typical dispatcher's day looks like this:

| Time | Pain Point |
|------|------------|
| 7am | Texts every driver manually just to know where they are |
| 9am | Assigns loads from memory — often the wrong driver, costly deadhead miles |
| 11am | Hears about a delay from the *customer*, not the system |
| 5pm | Chases BOLs, PODs, and fuel receipts to build a single invoice |
| Friday | Still can't answer "what's our cost per mile?" |

**The intelligence gap:** Trucker Path digitizes navigation, HOS, dispatch, and document capture — but the two halves (dispatcher web platform + driver mobile app) are still glued together with phone calls. HOS ticks on the driver's phone but doesn't feed dispatch decisions. Docs upload from the cab but don't auto-reconcile into invoices.

---

## Our Solution

HacTruck builds the **AI intelligence layer on top of Trucker Path's NavPro platform** — turning raw fleet data into real-time decisions. We address two of the five identified gap areas:

### Smart Dispatch
Score and rank available drivers by HOS remaining, current position, cost impact, and load fit — so Maria assigns the right truck on the first try, not the third call.

### Proactive Alerts
Surface route deviations, long idles, weather slowdowns, and breakdown signals *before* the customer calls — giving dispatchers time to reroute or relay.

---

## Live Demo Features

- **Command Center Dashboard** — glass-panel UI with live fleet board, driver status badges, and real-time map
- **Mapbox Fleet Map** — truck markers with HOS rings, color-coded status, compact info overlays
- **AI Load Matching** — `POST /api/match-load` ranks drivers by HOS, position, and fit via OpenAI
- **Weather Intelligence** — OpenWeather severity overlays with optional Maps 2.0 timeline scrub
- **511 Incident Feed** — real-time traffic incidents surfaced as proactive alerts
- **Dispatch Simulation** — animated ring simulation demonstrating the smart dispatch flow

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Map | Mapbox GL JS / react-map-gl |
| AI | OpenAI GPT-4o-mini (driver matching) |
| Weather | OpenWeather API 2.5 + Maps 2.0 tiles |
| Data | Fixture routes + live API routes |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/prajeetdarda/HacTruck.git
cd HacTruck
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox public token — powers the fleet map |
| `OPENWEATHER_API_KEY` | Weather severity overlays + optional Maps 2.0 forecast tiles |
| `OPENAI_API_KEY` | Server-side AI driver matching (`/api/match-load`) |
| `OPENAI_MODEL` | Optional — defaults to `gpt-4o-mini` |

### Run

```bash
npm run dev        # Development (webpack)
npm run dev:turbo  # Development (Turbopack)
npm run build      # Production build
npm run start      # Run production server
npm run lint       # ESLint
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Reference

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/fleet` | GET | Fleet driver + truck data |
| `/api/directions` | POST | Route calculation |
| `/api/assign` | POST | Load assignment |
| `/api/match-load` | POST | AI-ranked driver suggestions |
| `/api/weather/severity` | GET | Weather severity for map overlay |
| `/api/fixtures/*` | GET | Local demo/fixture data |

---

## Project Structure

```
HacTruck/
├── app/
│   ├── api/          # Next.js API routes
│   ├── components/   # React components (map, panels, toolbar)
│   └── page.tsx      # Main dispatch dashboard
├── public/           # Static assets (truck markers, icons)
├── .env.example      # Environment variable template
└── package.json
```

---

## The 5 Gaps We Mapped

From the Trucker Path challenge brief, here are all five identified intelligence gaps — we built toward two:

| Gap | What It Costs | Our Status |
|-----|--------------|------------|
| **Smart Dispatch** | Wrong driver → deadhead miles + ripple effect | Built |
| **Proactive Alerts** | Dispatcher learns about delays from customers | Built |
| Cost Intelligence | No unified cost-per-mile view | Roadmap |
| Safety & Compliance | HOS/fatigue risk surfaces only after an incident | Roadmap |
| Billing & Doc Automation | Invoice prep is a manual mini-project per load | Roadmap |

---

## Hackathon Context

This project was built as a **2-day sprint** for the **Trucker Path track at ASU GlobeHack 2026** — *Season 1* of the GlobeHack hackathon series hosted at Arizona State University.

**Track:** Marketplace & Growth  
**Sponsor:** Trucker Path (North America's leading trucking intelligence platform, 1M+ drivers)  
**Challenge:** Design and build an AI-native fleet operations assistant that helps a small fleet dispatcher make smarter, faster decisions — reducing cost per mile and driver downtime.  
**Presented to:** Mihir Gupte, Product Manager @ Trucker Path

The deliverables required a **live demoable prototype**, a product deck, and a GTM plan. HacTruck is the working prototype.

---

## Deploy

Compatible with Vercel or any platform with Next.js support. Set the same environment variables in your host dashboard.

```bash
vercel deploy
```

---

## License

MIT
