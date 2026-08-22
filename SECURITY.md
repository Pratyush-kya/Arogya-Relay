# Security Policy

## Prototype boundary

Arogya Relay is a research and interface prototype. Do not enter, upload, or
commit real patient information. It is not approved for diagnosis, prescribing,
clinical decision-making, or production health-data processing.

The demonstration role tokens are intentionally limited scaffolding. A real
deployment requires a vetted identity provider, MFA, short-lived sessions,
server-side RBAC, managed encryption keys, audit logging, retention controls,
incident response, and independent security and clinical-safety review.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, personal
data, screenshots of patient information, or access tokens. Contact the project
owner privately with:

- the affected route or component;
- clear reproduction steps using synthetic data;
- the security impact;
- a suggested remediation, when available.

Revoke and rotate any secret that may have been disclosed. Never paste secrets
into GitHub issues, pull requests, discussions, logs, or test fixtures.

## Hardening already in place

Arogya Relay's prototype security posture includes:

- **Request guards** (`lib/http-security.ts`): every JSON API rejects
  non-`application/json` content types, bodies whose declared size exceeds a
  per-route ceiling, and cross-site or mismatched-origin writes via
  `sec-fetch-site` / `Origin` checks.
- **Role-based access control** (`lib/auth.ts`): admin/doctor gates are
  enforced server-side. Bearer tokens are compared with a **constant-time**
  helper (`constantTimeEqual`) so a wrong token cannot be distinguished from a
  partially-correct one by response timing. The token mechanism is explicit,
  reviewed scaffolding — a real deployment must replace it with a vetted
  identity provider, MFA, and short-lived sessions.
- **Edge security headers** (`worker/security-headers.ts`): every response
  carries CSP, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS,
  `Referrer-Policy`, `Cross-Origin-Opener-Policy`, and a restrictive
  Permissions-Policy. Server/implementation headers are stripped.
- **SSRF guard** (`lib/clinical/online-adapter.ts`): online evidence lookup is
  restricted to an allow-listed set of hosts; raw patient free text never
  leaves the request boundary.
- **Safe image handling**: the image optimizer does not process SVG sources by
  default, preventing stored-XSS via uploaded SVGs.
- **No `dangerouslySetInnerHTML` / `innerHTML` / `eval`** anywhere in the app,
  so rendered guidance cannot be injected with script.

## Maintainer checks

Before merging a change:

1. Run `npm run check`.
2. Run `npm run audit:prod` with current registry access.
3. Confirm `.env`, local databases, build output, and real data are not staged.
4. Review API input limits, authentication, authorization, and response caching.
5. Revalidate clinical wording and prototype limitations.

Supported security fixes apply to the latest `main` branch only.
