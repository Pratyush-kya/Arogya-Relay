# Handover Guide — Arogya Relay

Status: draft — 16 August 2026

This guide explains how to take ownership of the Arogya Relay prototype after
build completion: what the client receives, how to run and deploy it, and what
is (and is not) included in ongoing maintenance.

## What the client owns

Per the website guide, the client should own:

- Domain registrar account (if a custom domain is used)
- Cloudflare Workers hosting project
- GitHub repository / organization
- Any future database (Cloudflare D1)
- Analytics property (if used)
- Search Console property (if public)
- Font licences (Geist is open-source — no licence cost)

## What is delivered at handover

- [ ] Final source code (GitHub repository)
- [ ] Deployment instructions (this guide + `07-technical-plan.md`)
- [ ] Environment-variable list (`.env.example` — names only, no secrets)
- [ ] DNS documentation (if a custom domain is used)
- [ ] Short recorded training session (screencast)
- [ ] Warranty and support dates (30-day warranty from handover)
- [ ] Renewal calendar (domain auto-renew, if any)
- [ ] Admin access details (via password manager — see `09-access-register.md`)
- [ ] Third-party subscription list (Cloudflare free tier; optional paid items)

## How to run locally

```bash
npm install        # Node.js >= 22.13.0 required
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # run production build
npm run lint       # ESLint
npm test           # rendered-output test
```

## How to deploy (Cloudflare Workers, free tier — no credit card)

1. The client creates/owns the Cloudflare account (2FA enabled).
2. Connect the GitHub repository to the Worker.
3. Deploy the build; a `*.workers.dev` URL is provided free.
4. Optional: add a custom domain (client-owned registrar, ~$10–25/yr) and
   configure DNS + HTTPS.
5. Confirm certificate auto-renewal.

> Optional paid alternatives (opt-in only): Vercel Pro (~$20/mo) or a custom
> domain. The default is fully free.

## Environment variables

- Real secrets are **never** in the repo. Use `.env.example` for the list of
  variable names.
- Store real values in the password manager and the host's encrypted env config.
- Future/optional: `DATABASE_URL` for Cloudflare D1.

## Backup & recovery

- Source code is backed up in Git (GitHub).
- For a future real deployment: enable D1 backups, test restore, document the
  procedure. (Not needed for the fictional-data prototype.)
- Keep `.gitignore` excluding env files and real data.

## Maintenance plan (optional)

Included in an agreed retainer:

- Dependency and security updates
- Uptime / health checks
- Form-delivery and broken-link checks
- Small content changes
- Performance monitoring
- Monthly support hours (as agreed)

**Not maintenance** (becomes a separately priced change request):

- New features (auth, real backend, sensors)
- Redesign or new pages beyond scope
- Payment/integration work
- Clinical-protocol changes

## Support & warranty

- **Warranty:** 30 days from handover for defects in the delivered prototype.
- **No production SLA:** this is a research/UI prototype, not a certified medical
  device.
- For any real pilot, engage clinical, security, privacy, and legal specialists
  (see `README.md` and `02-requirements.md`).

## Quick reference

| Topic | Doc |
| --- | --- |
| Strategy & brief | `01-client-brief.md` |
| Requirements | `02-requirements.md` |
| Scope & dates | `03-scope-of-work.md` |
| Structure | `04-sitemap.md` |
| Content | `05-content-inventory.md` |
| Visual system | `06-design-system.md` |
| Build & deploy | `07-technical-plan.md` |
| Costs | `08-cost-register.md` |
| Access/accounts | `09-access-register.md` |
| QA | `10-qa-checklist.md` |
| Launch | `11-launch-checklist.md` |
