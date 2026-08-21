# Problem Statement 2: Precise Location, Hospitals and Health Camps

Copy everything below this line into your coding agent.

---

Work directly in:

`/home/pratyush/Project/Website/Arogya-Relay`

Act as a combined GIS architect, emergency-medicine safety reviewer, Indian public-health programme specialist, ambulance/referral workflow specialist, privacy engineer, accessibility designer and senior Next.js/Cloudflare developer.

Inspect the existing application, database scaffolding, worker security, hosting configuration and tests. Preserve its Next.js/Vinext structure, visual system and offline-first behavior.

## Objective

Build a **Nearby Care** and referral-navigation system that:

- obtains the patient’s location with explicit permission;
- shows GPS accuracy and timestamp;
- supports manual correction by pin, village, address or landmark;
- finds appropriate hospitals, PHCs, CHCs, Ayushman Arogya Mandirs, clinics, pharmacies and government services;
- displays verified active camps and Mobile Medical Unit visits;
- works under intermittent 2G and offline conditions;
- ranks clinical suitability and verified capability before distance.

## Location acquisition

Use `navigator.geolocation` only over HTTPS. Explain the purpose before requesting permission. Implement `getCurrentPosition` and, when appropriate, `watchPosition` with high-accuracy options, timeouts and cache-age limits.

Record latitude, longitude, horizontal accuracy and capture time. Display an accuracy circle and the states acquiring, accurate, approximate, stale, denied and unavailable. Never call browser location “exact.” Never use IP geolocation for emergency routing. Require confirmation when accuracy is poor.

Do not retain continuous location history by default. Save only the minimum confirmed referral snapshot after consent, with deletion and retention controls.

## Map architecture

Use MapLibre GL JS without requiring Google Maps or a commercial API key.

Online mode:

- use a licence-compatible vector-tile source with attribution;
- create an adapter for a self-hosted OSRM or Valhalla route service;
- do not silently depend on public demo routing servers.

Offline mode:

- use district/region PMTiles packs;
- show size before download;
- cache only the selected region in suitable browser storage or an R2-backed download;
- show cached facilities, roads and administrative areas;
- label straight-line/offline estimates separately from road ETA.

Do not download all-India map data to a low-storage device.

## Facility sources and verification

Implement source adapters in this priority order:

1. ABDM Health Facility Registry for verified facility identity.
2. Official State/UT health and NHM directories.
3. Official PM-JAY empanelled hospitals.
4. District health administration feeds.
5. Current, owned data.gov.in datasets.
6. OpenStreetMap only for supplemental geometry and road context.

Store source organisation, URL, external ID, fetched time, verified time, expiry and per-field provenance. HFR registration is not proof that a facility is open, has beds/oxygen or can treat every emergency. Show “call to confirm” unless verified live information exists.

## Camps and government services

Do not fabricate camps or keep old announcements active. Build adapters for district/state NHM feeds, MMU schedules, official announcements, authorised district uploads, Arogya Mandir outreach, eSanjeevani access points and verified health-worker entries.

Every event must contain organiser, source, services, eligibility, start/end, recurrence, venue, contact, verification status, last verification, cancellation status and validity window. Hide expired events automatically. Clearly mark stale/unverified data. Add an authorised verification/correction/cancellation workflow with audit history.

## Referral ranking

Filter by required capability before ranking. Consider emergency capability, speciality, child/pregnancy suitability, government/PM-JAY status, verified opening/availability, road time, distance, accessibility, transport and data freshness.

Never send a critical patient to a closer facility known to lack the necessary capability.

For emergencies:

- prominently offer **Call 112**;
- show confirmed location and accuracy;
- offer an appropriate emergency facility;
- provide tap-to-call and location sharing;
- warn users to confirm availability;
- do not delay the emergency action for map loading.

Do not claim ambulance dispatch unless an authorised integration confirms it.

## Data model

Enable D1 and add normalized tables for facilities, capabilities, source records, verification history, camps, event services, schedules, coordinates, referrals, consent, minimal location snapshots, routing results and audit events.

Use practical indexes for bounding boxes, active date ranges, facility type and verification status. Begin with bounding-box filtering and Haversine distance unless a supported spatial extension is verified.

## Privacy and security

- Ask for location only after a user starts a nearby-care/referral action.
- Explain purpose, retention and sharing.
- Keep coordinates out of URLs, analytics and ordinary logs.
- Never share coordinates with RAG/literature services.
- Enforce protected reads/writes server-side.
- Validate coordinates, dates, phones, URLs and uploaded data.
- Protect ingestion from SSRF, malicious HTML, CSV injection and duplicate records.
- Implement consent, correction and deletion controls aligned with applicable DPDP/ABDM principles.

## Experience

Provide map and accessible list views, accuracy circle/text, distance and ETA with units, source/last-verified labels, government/PM-JAY/emergency/maternal/child/accessibility filters, stale/offline status, village/landmark search, copy/share referral brief and printable/offline directions. Keep all labels ready for English, Hindi and Odia localization.

## Testing

Test granted/denied/revoked permission, inaccurate/stale readings, invalid coordinates, manual selection, online/offline maps, missing tiles, no results, conflicting/stale data, expired/cancelled camps, emergency action without a map, capability-first ranking, routing failure, low bandwidth/memory, attribution, privacy/authorization, keyboard/touch/screen reader use and existing dashboard regressions.

## Deliverables

Implement and provide:

1. Working Nearby Care UI.
2. Location consent/privacy flow.
3. MapLibre/PMTiles online-offline map.
4. Facility/camp adapters and verification model.
5. D1 schema and migrations.
6. Referral-ranking explanation.
7. Clearly labelled synthetic demo data.
8. Automated tests.
9. Source/freshness documentation.
10. Remaining ABDM/state/district/hospital/ambulance agreements.
11. Build, lint and test results.

Never claim live beds, current camps or ambulance dispatch unless the official integration is verified end to end.
