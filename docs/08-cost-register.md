# Cost Register — Arogya Relay

Status: draft — 16 August 2026

All prices below are **snapshots as of August 2026** and must be re-checked
before sending any client quotation. The prototype is built to run on a
**fully free, no-credit-card** stack (Cloudflare Workers free tier).

## Principles

- The default deployment uses **$0 / no-credit-card** infrastructure.
- Every paid item below is **optional opt-in** and clearly marked.
- The client owns all accounts (see `09-access-register.md`).

## One-time costs

| Item | Cost | Owner pays | Notes |
| --- | --- | --- | --- |
| Custom domain (optional) | ~$10–25 one-time + annual | Client | e.g. porkbun `.com`; quote renewal price, not promo |
| Brand/logo assets (optional) | Variable / pro bono | Client or build team | "AR" mark already in app |

## Annual renewals

| Item | Cost (snapshot Aug 2026) | Owner | Renewal date | Cancellation |
| --- | --- | --- | --- | --- |
| Custom domain (optional) | ~$10–25/yr | Client | Set auto-renew + registrar lock | Via registrar account |
| Fonts (Geist) | $0 | — | N/A | Open-source (OFM) |

## Monthly subscriptions

| Item | Cost (snapshot Aug 2026) | Required? | Owner |
| --- | --- | --- | --- |
| Cloudflare Workers | $0 (free tier) | Yes (free) | Client |
| Vercel Hobby | $0 | No (alt host) | Client |
| Vercel Pro | ~$20/mo (incl. $20 usage credit) | No — optional | Client |
| Analytics (privacy-friendly) | $0–paid | Optional | Client |

## Usage-based costs

| Item | Basis | Notes |
| --- | --- | --- |
| Cloudflare Workers requests | Free tier covers prototype traffic | Monitor; upgrade only if needed |
| Bandwidth | Free tier ample for demo | — |

## Who owns / who pays

- **Client owns:** domain registrar, Cloudflare account, GitHub repo, any future
  DB/analytics.
- **Build team:** provides code; does not finance client's domain/hosting.

## Cancellation procedure

- Domain: disable auto-renew in registrar; let expire or transfer.
- Cloudflare/Vercel: downgrade to free tier or delete project in client account.
- Never leave a paid subscription on a build-team card.

## Price-validity note

> Prices are snapshots as of **August 2026** and are subject to change. Re-check
> Cloudflare, Vercel, and registrar pricing before quoting the client. Quote the
> **renewal** price, not only first-year promotions.

## Development price (separate from infra)

Per the website guide, project price = estimated hours × rate + 25–40% risk
allowance + direct third-party costs + tax. For this prototype, third-party
infra costs are **$0** on the free tier; any custom domain is billed to the
client separately.
