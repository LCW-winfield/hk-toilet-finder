 # Read.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

HK Toilet Finder (香港搵公廁) — a Next.js 16 app for finding and navigating to public toilets in Hong Kong. Bilingual (Traditional Chinese / English), with an interactive Leaflet map, filterable toilet list, and walking-route display via OpenStreetMap.

## Essential commands

```
npm run dev          # Start dev server (Next.js with Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (next/core-web-vitals)
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Push Prisma schema to SQLite (no migrations)
npm run import:toilets  # Import toilet data from data/raw/ into the DB
```

There is no test suite.

## Architecture

### Data layer

- **SQLite** via Prisma. The schema (`prisma/schema.prisma`) has three models: `Toilet` (main entity with geo, accessibility, cleanliness), `ToiletTag` (key-value tags per toilet), and `ToiletSubmission` (user-contributed corrections/new toilets, status-tracked).
- `src/lib/prisma.ts` — singleton PrismaClient, reused across hot reloads in dev.
- `src/lib/toilets.ts` — data-access functions: `getToilets(filters)`, `getToiletById(id)`, `haversineDistance()`, `rankNearestToilet()`. Filters support `accessible`, `babyCare`, `avoidOdor`, `minCleanliness`. Nearest ranking uses distance + odor penalty + cleanliness penalty.
- Database lives in `dev.db` (SQLite file, git-ignored). Seed data via `scripts/import-toilets.ts`, which reads JSON from `data/raw/` and clears + repopulates.

### Routing (Next.js App Router)

- `src/app/layout.tsx` — root layout: metadata, nav header (home + submit links).
- `src/app/page.tsx` — home page: **server component** that fetches all toilets via `getToilets()` and passes them to `<HomeClient>`.
- `src/app/toilets/[id]/page.tsx` — toilet detail page (server component, single `getToiletById` call).
- `src/app/submit/page.tsx` — submission form page (static, renders `<SubmissionForm>`).

### API routes

- `src/app/api/toilets/route.ts` — `GET` with optional query params (`accessible`, `babyCare`, `avoidOdor`, `minCleanliness`). Zod-validated.
- `src/app/api/toilets/nearest/route.ts` — `GET` requires `lat`/`lng`, accepts same filter params. Returns the single nearest toilet with distance and score.
- `src/app/api/submissions/route.ts` — `POST` only. Zod-validated body, creates a `ToiletSubmission` record with status `"pending"`.

### Client components

- `src/components/home-client.tsx` — the main UI shell: sidebar with brand, language toggle, filter controls (accessible, baby-care, avoid-odor, min-cleanliness slider), recommendation card, and scrollable toilet list. Manages user location, filtering, nearest-finding, and "Find nearest" button logic. Renders the map via dynamic import.
- `src/components/map-view.tsx` — Leaflet map wrapper, dynamically imported with `ssr: false` (Leaflet requires `window`). Manages map init, user marker, toilet markers (with click handlers and popups), and a dashed route polyline. Accepts props for toilets, userLocation, selectedToiletId, and onSelectToilet callback.
- `src/components/submission-form.tsx` — controlled form for submitting new toilets or corrections. Posts to `/api/submissions`.

### i18n

- `src/lib/i18n.ts` — flat key-value translation objects for `zh-HK` and `en`. Some values are functions taking numbers (distances, counts). No i18n library — just direct lookup. Locale defaults to `zh-HK`; toggled in the sidebar.

### Legacy standalone file

- `app.js` — a pre-migration vanilla-JS version of the entire app with hardcoded toilet data and inline Leaflet/translations. It is **not used** by the Next.js app. Kept for reference or as a standalone demo.

## Key patterns

- **Path alias**: `@/*` maps to `src/*` (configured in tsconfig.json).
- **Server → client data flow**: Server components fetch data and pass as props to client components. No client-side data fetching for the main toilet list.
- **Zod on every API boundary**: both query params (via `z.coerce`) and request bodies.
- **`useMemo` for derived data**: filtering and distance calculations in `home-client.tsx`.
- **ref-based click handlers in Leaflet**: `clickHandlerRef` pattern avoids stale closures from Leaflet's event binding.
- **No auth / no middleware**: the app is fully public.
