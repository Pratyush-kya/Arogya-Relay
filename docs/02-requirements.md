# Requirements — Arogya Relay

Status: draft — 16 August 2026

This document separates what the Arogya Relay prototype **must** do at launch
from what is optional, future, or explicitly excluded. It prevents
"I thought that was included" disagreements.

## Context

Arogya Relay is an offline-first disease-monitoring **dashboard prototype** for
community health workers in low-connectivity areas of Meghalaya (demo villages:
Mawlynnong, North Ridge, Pynursla). It is a research / UI prototype with
**fictional demo data only** — not a certified medical device.

## Required for launch (MVP)

- [ ] Single-page dashboard with three in-app tabs: **Overview**, **Case queue**,
      **Field device** (already implemented in `app/page.tsx`).
- [ ] Field overview with screening and follow-up summary metrics.
- [ ] Syndromic trend visualization (e.g., respiratory-signal mini chart).
- [ ] Priority case queue with urgent / review / follow-up groupings.
- [ ] Guided "New screening" modal: patient reference, age, temperature, SpO₂,
      symptom checkboxes, field notes.
- [ ] Offline capture messaging + simulated sync ("Sync N reports") with status.
- [ ] Referral / follow-up summary surfaced from urgent cases.
- [ ] Field-device panel: battery, sensor status, local storage, self-check.
- [ ] Responsive layout for desktop, tablet, and mobile.
- [ ] Clear non-diagnostic / screening-support safety messaging in the UI.
- [ ] Legal pages: privacy, terms (at minimum placeholder content for a prototype).
- [ ] Error and 404 states (`error.tsx`, `not-found.tsx`).
- [ ] Deployed to a working preview URL (Cloudflare Workers free tier).

## Useful but optional

- [ ] Search / filter controls on the case queue (search box + filter chips
      already exist in the code but can be made functional).
- [ ] Contact page with a feedback channel.
- [ ] Light / dark theming beyond the current single theme.
- [ ] Locale / local-language prompt variants in the screening form.
- [ ] Structured data (JSON-LD) and an Open Graph social-sharing image.
- [ ] Privacy-friendly analytics on the demo deployment.

## Future phase (post-prototype)

- [ ] Authenticated, encrypted, auditable data storage.
- [ ] Real offline persistence (e.g., Drizzle ORM + Cloudflare D1 scaffolding
      already stubbed in the repo).
- [ ] Conflict-safe synchronization with a district health hub.
- [ ] Validated sensor integration through a documented hardware interface.
- [ ] Clinically-approved screening, triage, and referral protocols.
- [ ] Accessibility, usability, security, and clinical-safety testing.
- [ ] Independent penetration testing and regulatory review.

## Explicitly excluded (this prototype)

- [ ] Any collection or storage of **real patient information**.
- [ ] Clinical diagnosis or treatment decisions.
- [ ] Physical sensor / hardware integration.
- [ ] Live transmission of reports to any health authority.
- [ ] Authentication, accounts, or role-based access control.
- [ ] Payment, billing, or e-commerce functionality.
- [ ] Production-grade uptime, SLA, or support commitments.

## Non-functional requirements

- **Performance:** Core Web Vitals at the 75th percentile — LCP ≤ 2.5s,
  INP ≤ 200ms, CLS ≤ 0.1.
- **Accessibility:** WCAG 2.2 Level AA.
- **Browser support:** last 2 versions of major evergreen browsers; graceful
  degradation is not required for legacy browsers.
- **Privacy:** no real personal data; fictional demo data only; no third-party
  trackers that would contradict the privacy posture.
- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4,
  Node ≥ 22.13, deployed to Cloudflare Workers (free tier).

## Assumptions

- Demo data stays fictional and is reset/regenerable.
- The deployment target is the Cloudflare Workers free tier (no credit card).
- No backend services are required for the prototype to demonstrate its flow.
