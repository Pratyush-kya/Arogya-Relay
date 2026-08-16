# QA Checklist — Arogya Relay

Status: draft — 16 August 2026

Actionable checklist covering layout, functionality, accessibility (WCAG 2.2 AA),
and performance (Core Web Vitals). Tick each item before launch acceptance.

## Layout & responsiveness

- [ ] Desktop (≥1150px): sidebar + three tabs render correctly.
- [ ] Tablet (≤1150px): sidebar collapses to icon rail; layouts reflow.
- [ ] Mobile (≤820px): bottom nav bar; single-column cards.
- [ ] Small mobile (≤520px): metrics stack to 1 column; form is usable.
- [ ] No horizontal scroll on any breakpoint.
- [ ] `prefers-reduced-motion` disables animations/transitions.

## Keyboard & navigation

- [ ] All interactive elements reachable by Tab.
- [ ] Visible focus ring on every control (forest outline).
- [ ] Tab switching works via keyboard; active state announced.
- [ ] "New screening" modal opens/closes via keyboard (Esc or close button).
- [ ] Modal focus is managed (focus returns to trigger on close).
- [ ] Skip-to-content or logical tab order present.

## Forms & validation

- [ ] Screening form requires patient reference, age, temperature, SpO₂.
- [ ] Numeric inputs respect min/max (age 0–120, SpO₂ 50–100).
- [ ] Invalid input shows an accessible error message.
- [ ] Submit saves offline and adds to the queue (demo behavior).
- [ ] Cancel/close discards the draft.

## Content & states

- [ ] Page titles and meta descriptions set per route.
- [ ] Non-diagnostic / screening-support messaging visible in the modal.
- [ ] 404 page (`not-found.tsx`) renders for unknown routes.
- [ ] Error boundary (`error.tsx`) catches runtime errors with retry.
- [ ] Demo-data notice present (fictional data, no real patients).
- [ ] Social-sharing (OG) image present or intentionally omitted.

## Links & crawlability

- [ ] No broken internal links.
- [ ] `sitemap.ts` and `robots.ts` present (or indexing disabled for private).
- [ ] Canonical/preferred URL configured if a domain is used.

## Accessibility — WCAG 2.2 AA

- [ ] Color contrast AA (4.5:1 text, 3:1 large text) verified.
- [ ] Text alternatives for meaningful icons/images (aria-label where needed).
- [ ] Status updates use `aria-live` (notice strip).
- [ ] Dialog has `role="dialog"`, `aria-modal`, labelled title.
- [ ] Form inputs have associated labels.
- [ ] Priority conveyed by text + color (not color alone).
- [ ] Target size ≥ 24×24px for touch controls.
- [ ] No content flashes or repetitive auto-playing media.

## Performance — Core Web Vitals (75th percentile of real visits)

- [ ] **LCP ≤ 2.5s** — largest content (dashboard) paints quickly.
- [ ] **INP ≤ 200ms** — tab switches and button clicks feel instant.
- [ ] **CLS ≤ 0.1** — no layout shift on load or tab change.
- [ ] Images/fonts are optimized; Geist fonts self-hosted or cached.
- [ ] No render-blocking resources; reasonable bundle size.

## Security & privacy

- [ ] No real patient data; demo data is fictional.
- [ ] No secrets committed (`.env.local` git-ignored).
- [ ] HTTPS enforced on the deployed URL.
- [ ] Privacy/terms pages present for public deployment.

## Analytics & monitoring

- [ ] Analytics (if used) is privacy-friendly and consented.
- [ ] Search Console property configured (if public).
- [ ] Uptime/health check in place (free tier acceptable).

## Manual test pass

- [ ] Complete a screening end-to-end without guidance.
- [ ] Reach the case queue from Overview and review an urgent case.
- [ ] Trigger and observe the simulated sync flow.
- [ ] Verify the workflow is understandable to a first-time reviewer.
