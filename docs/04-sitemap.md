# Sitemap — Arogya Relay

Status: draft — 16 August 2026

This sitemap shows the **current real application** first, then the **planned
pages** required to make the prototype complete and presentable.

## Current application (as built)

Arogya Relay is a single dashboard route (`/`) with three in-app tabs. There are
no separate URLs for the tabs — they switch client-side.

```text
/  Dashboard
├── Overview tab
│   ├── Screening & follow-up summary metrics
│   ├── Respiratory-signal trend chart
│   ├── Urgent queue card
│   └── Recent screening signals (case list)
├── Case queue tab
│   ├── Queue summary (urgent / review / follow-up / cleared)
│   ├── Search + filter controls
│   └── Case rows (open referral brief)
└── Field device tab
    ├── Device illustration (AR-07)
    └── Diagnostics (battery, sensors, storage, self-check)
```

The "New screening" flow is a modal launched from any tab, not a separate route.

## Planned pages (to be added)

These pages round out the prototype for public/stakeholder viewing and safe
deployment.

```text
/            Dashboard (Overview · Case queue · Field device)
/privacy     Privacy policy
/terms       Terms of use
/contact     Contact / feedback (optional)
/404         Not found page (not-found.tsx)
error        Application error state (error.tsx)
```

## Notes

- The three dashboard tabs share one URL (`/`). If future analytics or deep
  linking are needed, consider hash or query-based tab state.
- `privacy` and `terms` are required for any publicly deployed prototype, even
  with fictional data, to set expectations about non-diagnostic use.
- `contact` is optional but useful for collecting staged-review feedback.
- `not-found.tsx` and `error.tsx` are Next.js special files that handle the 404
  and error states respectively.

## Sitemap / robots (SEO & crawlability)

- Add `app/sitemap.ts` and `app/robots.ts` (or `robots.txt`) so the demo is
  discoverable and the legal pages are indexed as expected.
- For a private prototype, `robots.ts` should disallow indexing.
