# Poson One-Way Route Guidance — Anuradhapura

A bilingual (සිංහල / English), installable PWA for the Sri Lanka Police to guide
pilgrims and drivers through the **temporary one-way road network** during the
2026 Poson festival in Anuradhapura.

Two apps share one backend:

- **`/`** — public app (no login): pick a start (live GPS) + destination, get the
  **best _legal_ one-way route**, plus Dansal and parking along the way.
- **`/admin`** — protected panel: draw/manage the one-way network, a live control
  board to open/close roads in real time, network validation, and JSON backup.

## Why a custom router (read this)

We do **not** use Google/Mapbox/OSRM directions. Those engines don't know about
the festival's temporary one-way conversions and would route people the wrong
way — a safety risk. Instead, the **police-drawn segments _are_ the routable
network**. Routing is a custom client-side directed-graph shortest-path
(Dijkstra + haversine A* heuristic) that traverses each segment **only** in its
`from → to` direction. It runs on-device, instantly, and works offline.

The router is a pure, unit-tested module:
- `src/routing/geo.js` — haversine, polyline length, point/segment snapping
- `src/routing/graph.js` — build the directed graph from nodes + open segments
- `src/routing/router.js` — Dijkstra/A*, GPS start-snapping, route planning
- `src/routing/validate.js` — pre-publish safety checks
- `src/routing/router.test.js`, `src/data/seed.test.js` — **14 tests** proving
  one-way correctness (e.g. it refuses to travel against a one-way road, and
  re-routes around closed segments).

```bash
npm test          # run the routing/validation/seed tests
```

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build into dist/
npm run preview   # preview the production build
```

The app **runs out of the box on bundled seed data** (the demo Poson corridor:
Pothanegama → Yapanaya past the Atamasthana sites). No Firebase needed to try it.

- Public flow: **Use my live location → pick a destination → GO**.
- Admin demo login: **`admin@police.lk`** / **`poson2026`**.

Admin edits propagate to the public app live (across browser tabs) even in demo
mode, via `BroadcastChannel` + `localStorage`.

## Going live with Firebase

The data layer (`src/data/repo.js`) is Firebase-ready and auto-switches the
moment credentials are present:

1. Create a Firebase project; enable **Cloud Firestore** and **Authentication
   (Email/Password)**.
2. Copy `.env.example` → `.env.local` and fill in your web app config.
3. Deploy the security rules (below) and host the build:

```bash
npm i -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules     # rules in firestore.rules
npm run build
firebase deploy --only hosting             # serves dist/ (see firebase.json)
```

### Adding an admin

Admins are any signed-in user with a doc at `admins/{uid}`:

1. In Firebase Console → Authentication, create the user (email/password).
2. Copy their **UID**.
3. In Firestore, add `admins/{uid}` = `{ name, role: "superadmin" | "operator" }`.
   Only a `superadmin` can manage the `admins` collection (per the rules).

### Security rules (`firestore.rules`)

- `nodes`, `segments`, `dansal`, `parking`, `config`: **public read, admin write**.
- `admins`: superadmin only.
- `reports`: anyone may **create**; only admins may read/update.

## Data model (Firestore collections)

`nodes` (junctions), `segments` (directed one-way edges with a display polyline +
auto-computed `lengthMeters` + `status`), `dansal`, `parking`, `admins`,
`reports`, and a single `config/main` doc. See `src/data/seed.js` for the exact
shapes and example data.

A road that is one-way during the festival is **one** directed segment. A road
that is genuinely two-way is stored as **two** segments (A→B and B→A).

## Drawing the official plan (admin)

**Map Editor** tab:

1. **Add junction** — tap the map, name it (Sinhala + English), flag it as an
   entry and/or exit point.
2. **Draw one-way road** — pick the **FROM** junction, optionally tap the map to
   trace the road's shape, pick the **TO** junction. Direction arrows show the
   legal flow; length is computed automatically.
3. **Add Dansal / parking** — tap the map and fill in the details.
4. **Select / move** — tap a junction to edit/delete; drag to reposition.
5. **Overlay reference map** — upload the police hand-drawn arrow map as a
   semi-transparent overlay and trace on top of it (opacity slider).
6. **Backup** tab — export/import the whole network as JSON.

**Always run the Validation tab before going live.** It flags entry points that
can't reach any exit, dead-end/unreachable/orphan junctions, and duplicate
roads — wrong directions are a safety risk.

## Updating road status live during the festival

**Live Control** tab (the most-used screen):

- **Roads**: toggle any segment **Open / Closed**. Closed roads instantly drop
  out of routing; anyone whose active route used that road is auto-re-routed.
- **Dansal**: toggle **Active / Off**.
- **Parking**: set **Available / Filling / Full** (green / amber / red).

Every change writes to the backend and propagates to all public users in
seconds via realtime listeners.

## Offline & performance

- The whole network loads **once** via realtime listeners and is cached
  (Firestore persistent cache when live; `localStorage` in demo mode). Routing
  is fully on-device, so it keeps working with weak/no signal — an "offline,
  data may be outdated" banner shows the last-updated time.
- OSM map tiles are cached by the service worker (Workbox) for re-use.

## Tech

React + Vite · Leaflet + OpenStreetMap · `vite-plugin-pwa` · `react-i18next`
(Sinhala default) · Firebase (Firestore + Auth + Hosting) · Vitest.
```
