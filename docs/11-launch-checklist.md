# Launch Checklist — Arogya Relay

Status: draft — 16 August 2026

Final checklist before the Arogya Relay prototype goes live. Complete after QA
(`10-qa-checklist.md`) passes and client acceptance is granted.

## Pre-launch (build team)

- [ ] `npm run build` succeeds with no errors.
- [ ] `npm run lint` passes.
- [ ] `npm test` rendered-output check passes.
- [ ] All three tabs (Overview, Case queue, Field device) verified.
- [ ] "New screening" modal works and validates input.
- [ ] Simulated sync flow behaves correctly.
- [ ] 404 (`not-found.tsx`) and error (`error.tsx`) states added and tested.
- [ ] Legal pages created: `/privacy`, `/terms` (and `/contact` if in scope).
- [ ] Non-diagnostic / fictional-data messaging visible.

## Performance & accessibility

- [ ] Core Web Vitals met: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- [ ] WCAG 2.2 AA checks passed (contrast, focus, ARIA, labels).
- [ ] `prefers-reduced-motion` respected.
- [ ] Responsive at desktop, tablet, mobile, small-mobile breakpoints.

## Deployment (Cloudflare Workers, free tier)

- [ ] Build deployed to Cloudflare Workers (no credit card).
- [ ] Preview URL shared with client for staged review.
- [ ] Production URL configured (custom domain optional, client-owned).
- [ ] HTTPS enabled and HTTP→HTTPS redirect active.
- [ ] Both `example.com` and `www.example.com` handled (if domain used).
- [ ] Certificate auto-renewal confirmed.
- [ ] DNS tested globally (if domain used); existing MX/email records preserved.

## SEO & crawlability

- [ ] `sitemap.ts` and `robots.ts` deployed (or indexing disabled if private).
- [ ] Page titles and meta descriptions set.
- [ ] Social-sharing (OG) image added or intentionally omitted.

## Legal & content

- [ ] Privacy policy published and linked.
- [ ] Terms of use published and linked.
- [ ] Contact/feedback channel live (if in scope).
- [ ] Demo-data disclaimer visible.

## Client acceptance (Stage 5)

- [ ] Written approval for desktop + mobile layouts.
- [ ] Written approval for text and images.
- [ ] Written approval for forms and legal pages.
- [ ] Final invoice / launch payment agreed (per `03-scope-of-work.md`).

## Post-launch

- [ ] Repository, deployment instructions, and env-var list handed over.
- [ ] Access register (`09-access-register.md`) updated with live accounts.
- [ ] Renewal calendar noted (domain auto-renew, if any).
- [ ] Warranty start date recorded (30 days).
- [ ] Optional: portfolio case study created **only with client permission**.

## Go / no-go

- [ ] All critical items above checked.
- [ ] Client sign-off received in writing.
- [ ] Launch approved: ☐ Yes ☐ No
