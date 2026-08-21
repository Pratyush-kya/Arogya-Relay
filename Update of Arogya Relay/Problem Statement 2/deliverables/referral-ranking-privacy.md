# Nearby Care — Referral-Ranking Explanation & Privacy

## Capability-first ranking (the safety rule)

The ranking in `lib/nearby/ranking.ts` follows one non-negotiable principle:

> **Filter by required capability BEFORE ranking by proximity.**

A critical patient is never sent to a *closer* facility that lacks the needed
capability. When `capabilityFirst` is true (the default for emergency/capability
queries), any facility missing a required capability is **excluded entirely**,
never merely pushed lower while a patient is misrouted.

### Scoring

Each candidate receives:

- `capabilityScore` = matched required caps / total required caps (0..1).
- `proximityScore` = `1 / (1 + distanceKm/8)` — closer is better, soft decay.
- `freshnessScore` — higher for recently `verified` records; lower for
  `unverified`/`stale`/`disputed`.
- `schemeScore` — bonus for Ayushman/PM-JAY when preferred.

Blended score = `0.6*capability + 0.25*proximity + 0.1*freshness + 0.05*scheme`.
Results are sorted **capability-met first**, then by blended score.

### Distance vs road ETA

- Straight-line (haversine) distance is always computed and labelled as an
  *estimate*.
- Road ETA (from a self-hosted OSRM/Valhalla adapter) is preferred for the
  proximity term **when available**; otherwise straight-line is used and the UI
  shows "straight-line estimate only".
- Road ETA is never fabricated; if routing fails, the system falls back to the
  straight-line estimate and says so.

### Emergency behaviour

- `Call 112` is always offered prominently and does not wait for the map.
- `pickEmergencyFacility()` returns a verified, emergency-capable facility or
  `null`; it never returns an incapable facility when a capable one exists.

## Privacy & security

- **Ask only after action:** location is requested only after the user starts a
  Nearby Care action and grants consent; purpose, retention and sharing are
  explained.
- **Minimal retention:** only a consent-gated snapshot (lat/lng/accuracy/time/
  purpose/retention) is kept; continuous history is not. Delete control clears
  it immediately.
- **No coordinates in URLs/analytics/logs:** `coarseGrid()` redacts precise
  coordinates to a ~5 km grid for any logging.
- **Never shared with RAG/literature services:** Nearby Care coordinates are
  independent of the Care Guidance clinical RAG; they are not sent to any
  literature or model service.
- **Server-side authorization:** protected reads/writes enforce RBAC; ingestion
  validates coordinates, dates, phones, URLs and rejects malicious HTML/CSV
  injection and duplicate records (SSRF guard on any adapter fetch).
- **Consent/correction/deletion:** aligned with DPDP/ABDM principles; the
  `location_snapshots` and `verification_history` tables support these.

## i18n readiness

All user-facing labels are centralised in `I18N` (`lib/nearby/types.ts`) with
`en` / `hi` / `or` strings, ready for English, Hindi and Odia. The UI language
toggle is present; a full translation pass is a follow-up.
