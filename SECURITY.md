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

## Maintainer checks

Before merging a change:

1. Run `npm run check`.
2. Run `npm run audit:prod` with current registry access.
3. Confirm `.env`, local databases, build output, and real data are not staged.
4. Review API input limits, authentication, authorization, and response caching.
5. Revalidate clinical wording and prototype limitations.

Supported security fixes apply to the latest `main` branch only.
