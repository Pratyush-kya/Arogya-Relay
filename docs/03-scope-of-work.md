# Scope of Work — Arogya Relay

Status: draft — 16 August 2026

This document defines exactly what the Arogya Relay prototype build includes, so
both sides agree before work continues. It builds on `02-requirements.md`.

## Project type

Offline-first **disease-monitoring dashboard prototype** (research / UI artifact)
for community health workers in remote Meghalaya villages. Frontend-only with
fictional demo data. Not a medical device.

## Exact pages / routes

| Route | Type | Status |
| --- | --- | --- |
| `/` Dashboard (Overview / Case queue / Field device tabs) | App route | Built |
| `/privacy` Privacy policy | Planned | To create |
| `/terms` Terms of use | Planned | To create |
| `/contact` Contact / feedback | Planned (optional) | To create |
| `/404` Not found | Planned | To create (`not-found.tsx`) |
| Error state | Planned | To create (`error.tsx`) |

The dashboard is a single page with three client-side tabs; there are no separate
URLs for the tabs in the current implementation.

## Features and integrations

- Three-tab dashboard: Overview, Case queue, Field device.
- Overview: metric cards (screenings, signals, follow-ups, referrals), respiratory
  trend chart, urgent queue card.
- Case queue: summary counts, search + filter chips, case rows.
- Field device: device illustration, diagnostics (battery, sensors, storage,
  self-check).
- "New screening" modal with validation and non-diagnostic note.
- Simulated offline capture + sync with status updates.
- Legal pages and error/404 states.
- Deployment to Cloudflare Workers (free tier).

**Integrations:** none required for the prototype. Drizzle ORM + Cloudflare D1
scaffolding exists in the repo but is optional and out of scope unless requested.

## Design concepts

- **1 visual concept** based on the existing implemented design (forest/mint
  clinical theme). No alternate concepts for this prototype phase.
- Iteration occurs via staged review (see `01-client-brief.md` approval stages).

## Revision rounds

- **Up to 2 revision rounds** after the first visual/staging review.
- Each round covers refinements within the agreed scope; new features become
  change requests.

## Content responsibilities

| Asset | Owner | Notes |
| --- | --- | --- |
| Demo data (villages, cases, readings) | Build team | Fictional, regenerable |
| Safety / non-diagnostic copy | Build team + clinical advisor review | Must stay non-diagnostic |
| Privacy & terms text | Client / legal advisor | Placeholder acceptable for prototype |
| Brand name & logo mark ("AR") | Client | Already in app |
| Screenshots for portfolio | Build team | Only with client permission |

## Browser / device support

- Desktop, tablet, mobile (responsive breakpoints already at 1150px, 820px,
  520px).
- Last 2 versions of Chrome, Edge, Firefox, Safari.
- `prefers-reduced-motion` respected.

## Delivery dates

| Milestone | Target |
| --- | --- |
| Strategy + sitemap approval | Week 1 |
| Wireframe / structure review | Week 1–2 |
| Visual design review | Week 2 |
| Staging URL live | Week 3 |
| Acceptance + launch | Week 3–4 |

Dates to be confirmed with the client's calendar.

## What counts as a change request

- Any new page, feature, or integration not listed above.
- Adding authentication, real data, or backend services.
- A third revision round.
- Change of deployment target or tech stack.

Change requests are priced separately and scheduled before work begins.

## Maintenance and warranty

- **Warranty:** 30 days after handover for defects in the delivered prototype.
- **Maintenance:** optional; covers dependency updates, small content fixes,
  uptime checks. New features are change requests, not maintenance.
- No production SLA applies — this is a research prototype.
