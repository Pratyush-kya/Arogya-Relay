# Nearby Care — Architecture & Source/Freshness Model

_Part of Problem Statement 2: Precise Location, Hospitals and Health Camps._
**Prototype only.** No real patient data, no live beds/camps, no ambulance
dispatch. All facilities and camps are synthetic demonstrations.

## 1. Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Browser (field device / CHW)                                │
│  NearbyCare (app/nearby-care.tsx)                           │
│   ├─ consent gate (location only after action starts)      │
│   ├─ geolocation (HTTPS, high-accuracy, timeout, maxAge)   │
│   ├─ MapLibre GL JS map (raster OSM tiles + attribution)   │
│   ├─ list view, filters, camps, emergency 112               │
│   └─ accuracy circle (never labelled "exact")              │
│  lib/nearby/*  (geo, ranking, adapters, controller)         │
│  Cache Storage / IndexedDB (cached region pack, future)     │
└──────────────────────────────┬───────────────────────────┘
                                 │ HTTPS (de-identified; no coords to RAG)
                                 ▼
┌──────────────────────────────────────────────────────────┐
│ Cloudflare Worker (vinext)                                  │
│  D1: facilities, capabilities, source_records,              │
│      verification_history, camps, referrals,                 │
│      location_snapshots, routing_results                    │
│  R2: PMTiles region packs, facility assets                  │
│  Adapter layer (allow-listed sources; SSRF-guarded)         │
└──────────────────────────────────────────────────────────┘
```

## 2. Location acquisition

- `navigator.geolocation` only over HTTPS; purpose explained **before** the
  permission prompt.
- `getCurrentPosition` with `enableHighAccuracy`, `timeout: 10000`,
  `maximumAge: 60000`. `watchPosition` is available for high-acuity needs.
- Records `lat`, `lng`, `accuracyMeters`, `capturedAt`.
- States surfaced: `idle | acquiring | accurate | approximate | stale | denied |
  unavailable`. The label "exact" is **never** used; worst case is "accurate".
- IP geolocation is never used for emergency routing.
- Poor accuracy (±>500 m) requires confirmation before referral.
- No continuous location history by default; only a minimal, consent-gated
  snapshot with a retention window and delete control.

## 3. Map architecture

- **Online:** MapLibre GL JS with a licence-compatible raster source (OSM
  tiles, attribution shown). A self-hosted OSRM/Valhalla adapter is the
  intended routing backend (not a public demo server).
- **Offline (roadmap):** district/region PMTiles packs cached in the browser or
  R2; size shown before download; only the selected region is cached; cached
  facilities/roads/admin areas shown; straight-line vs road ETA labelled
  separately.
- All-India data is never downloaded to a low-storage device (bounding-box
  clamp, radius 0.5°).

## 4. Source priority & verification

Adapters run in priority order:

1. ABDM Health Facility Registry (verified identity)
2. State/UT NHM directories
3. PM-JAY empanelled hospitals
4. District health administration feeds
5. data.gov.in datasets
6. OpenStreetMap (geometry/road context only)

Each record stores: source organisation, URL, external ID, fetched time,
verified time, expiry, and per-field provenance. **HFR registration is not
proof a facility is open or has beds/oxygen** — the UI shows "call to confirm"
unless verified-live information exists (none in the demo).

## 5. Freshness

- `verifiedAt` / `fetchedAt` / `expiresAt` per facility and source record.
- `assessVerification()` marks records older than 365 days as `stale`.
- Camps expose `start`, `end`, `recurrence`, `validityEnd`, `cancelled`,
  `lastVerifiedAt`. Expired/cancelled camps are hidden automatically.
- Verification history is append-only (`verification_history`) for the
  authorised correction/cancellation workflow.
