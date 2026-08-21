# Nearby Care — Remaining External Agreements & Setup

## Agreements / integrations still required (not in this prototype)

This prototype uses **synthetic** facilities and camps. Going live requires the
following verified integrations — none are present here, and the UI never
claims otherwise:

- [ ] **ABDM Health Facility Registry (HFR)** — MoU / API access for verified
      facility identity. HFR registration alone does NOT assert open status,
      beds, oxygen or live capability.
- [ ] **State/UT NHM directories** — authorised feeds per state (e.g. Meghalaya
      NHM) with refresh and provenance.
- [ ] **PM-JAY empanelled hospital list** — NHA authorised dataset.
- [ ] **District health administration feeds** — official district uploads with
      an authorised verification workflow.
- [ ] **data.gov.in** — current, owned datasets with licence.
- [ ] **MMU schedules & eSanjeevani** — authorised access points.
- [ ] **Self-hosted routing** — OSRM or Valhalla instance (not public demo
      servers); SLA and uptime.
- [ ] **Ambulance dispatch** — an authorised integration that *confirms* dispatch.
      Arogya Relay must NOT claim dispatch without it.
- [ ] **Map tiles / PMTiles** — licence-compatible vector/raster source and
      region pack pipeline.
- [ ] **Privacy/legal** — DPDP and ABDM consent alignment, data-retention sign-off.
- [ ] **Clinical/safety review** — confirmation that capability metadata and
      emergency routing match local reality.

## Setup (no paid key, offline-capable)

```bash
npm install          # includes maplibre-gl
npm run dev          # dashboard → "Nearby care" tab
```

- **Online map:** MapLibre loads OSM raster tiles with attribution. To use a
  licence-compatible vector source, replace the `style` in `app/nearby-care.tsx`.
- **Offline map (roadmap):** cache a district/region PMTiles pack to R2 or
  browser storage; show size before download; only the selected region is cached.
- **D1 schema:**
  ```bash
  wrangler d1 execute DB --local --file=db/migrations/0002_nearby_care.sql
  # remote: wrangler d1 execute DB --remote --file=db/migrations/0002_nearby_care.sql
  ```
- **Synthetic data:** `lib/nearby/synthetic-data.ts` seeds facilities/camps for
  development and demos. Swap `syntheticFacilityAdapter` in
  `lib/nearby/adapters.ts` for the real allow-listed adapter in production.

## Build / verify

```bash
npm run build && npm test   # 31 tests: dashboard + clinical + nearby
npm run lint
```

All facility/camp data shown is synthetic and labelled as such in the UI.
