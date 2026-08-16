# Client Brief — Arogya Relay

Status: draft — 16 August 2026

This brief captures what the Arogya Relay project is, who it serves, and what the
current website prototype must achieve. It is written to align the build team and
the project stakeholders before any further design or code work begins.

## 1. Client's business and target customers

**Client (project owner):** The Arogya Relay research team — a public-health
prototype initiative exploring how community health workers (CHWs) in remote
parts of Meghalaya, India, can monitor disease signals where connectivity is
intermittent or absent.

**What the client does:** Builds and tests offline-first field tooling concepts
for frontline health workers. Arogya Relay is explicitly a **research and
user-interface prototype**, not a certified medical device or diagnostic product.

**Target customers / end users:**

- Primary: community health workers operating in low-connectivity villages
  (Mawlynnong, North Ridge, Pynursla are the demo clusters).
- Secondary: district health-hub reviewers who receive aggregated screening
  reports when connectivity returns.
- Tertiary: public-health researchers and programme funders evaluating the
  concept.

**Important constraint:** All people, readings, locations, and case records in
the application are **fictional demonstration data**. No real patient information
is collected or stored.

## 2. Primary purpose of the website

Provide a believable, offline-first **disease-monitoring dashboard prototype**
that shows how a field worker could:

- Record screenings (symptoms + vital signs) on a device that works without a
  live network.
- See emerging syndromic trends and outbreak signals across their villages.
- Prioritise urgent and routine cases for follow-up and referral.
- Store reports locally and "sync" them when the signal is stable.
- Check device health (battery, sensors, local storage).

The goal is to communicate the *concept and workflow* clearly — this is a UI/UX
research artifact, not production software.

## 3. Main action visitors should take

The primary action for the field worker is **"New screening"** — capture a
guided, offline-safe assessment. The secondary action is **reviewing the case
queue** to triage urgent signals and prepare referrals.

For research reviewers / stakeholders viewing the prototype, the main action is
**exploring the dashboard** (Overview → Case queue → Field device) to understand
the proposed workflow.

## 4. Competitors and reference websites

Arogya Relay is a concept prototype, so there is no direct commercial competitor
to "beat." Useful reference points for tone, layout, and trust signals:

- DHIS2 / District Health Information Software (aggregate health data dashboards).
- WHO mHealth and offline-first field-tooling guidance.
- Simple.org / OpenSRP (frontline health-worker record tools).
- Modern clinical and ops dashboards (clean, high-contrast, calm data UI).

These references inform *design language and credibility*, not feature copying.

## 5. Brand personality

- **Calm under pressure** — the UI must feel safe and uncluttered even when a
  case is urgent.
- **Trustworthy and clinical** — forest-green, paper-neutral palette; clear
  hierarchy; no alarmist colour overuse.
- **Field-ready** — rugged, legible, works in bright sunlight and on small
  screens.
- **Human and local** — respects the worker's context; privacy-aware (initials
  instead of names in shared views).
- **Honest** — prominently states it is screening-support only and does not
  diagnose.

## 6. Success measurements

Because this is a prototype, success is measured by **clarity and credibility of
the concept**, not production KPIs:

- Reviewers can complete a screening and reach the case queue without guidance.
- The offline / sync story is understood within the first 30 seconds of use.
- Non-diagnostic safety messaging is noticed and understood.
- Layout holds up on desktop, tablet, and mobile (field-device style).
- Stakeholders can explain the workflow back to the team after one session.

## 7. Decision-maker and approver

- **Product / research lead:** overall scope and acceptance (project owner).
- **Design approver:** visual and UX sign-off at staged reviews.
- **Clinical advisor (optional / future):** validates that screening and referral
  language is appropriately framed as non-diagnostic.

> Note: For a real pilot, a qualified clinical, security, privacy, and legal
> review would be required before any real patient data is handled. This is out
> of scope for the current prototype.

---

## Open questions for the client

- Who owns the final repository and deployment accounts? (See 09-access-register.)
- Is a public demo URL acceptable, or should the prototype stay private?
- Which clusters / languages should demo data represent beyond the three villages?
