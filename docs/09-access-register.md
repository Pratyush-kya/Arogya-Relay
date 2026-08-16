# Access Register — Arogya Relay

Status: draft — 16 August 2026

This register records **account ownership and administrator roles** for the
Arogya Relay prototype. It intentionally contains **NO passwords, API keys,
recovery codes, or secrets**.

> ⚠️ **Security rule:** Never store passwords, tokens, or recovery codes in this
> file or anywhere in the repository. Use a **password manager** (e.g., 1Password,
> Bitwarden, or the client's approved vault) to share credentials securely. Invite
> team members as administrators rather than emailing credentials.

## Accounts & ownership

| System | Purpose | Owner (legal) | Administrator(s) | Access method |
| --- | --- | --- | --- | --- |
| GitHub / repository | Source code & CI | Client organization | Client lead + build team (invited) | GitHub org invite (SSO/2FA) |
| Cloudflare account | Workers hosting + DNS | Client | Client + build team (invited) | Cloudflare account invite (2FA) |
| Domain registrar | Custom domain (optional) | Client | Client | Registrar account (client email, 2FA) |
| Cloudflare D1 (future) | Optional database | Client | Client + build team | Via Cloudflare account |
| Analytics (optional) | Privacy-friendly metrics | Client | Client | Invite link via password manager |
| Fonts (Geist) | Typography | Open-source | N/A | Public CDN / package |

## Environment variables (names only — never values)

Reference `.env.example` for the list of variable **names**. Real values live in
the password manager and in the host's encrypted environment settings.

- `DATABASE_URL` (future / optional)
- `CLOUDFLARE_*` deployment credentials (managed via Cloudflare account, not files)
- Any API keys for future integrations (none in prototype)

## Secret-handling rules

- [ ] No `.env.local` or real secrets are committed (enforced by `.gitignore`).
- [ ] Secrets are shared only through the password manager.
- [ ] Each account uses a unique, strong password + 2FA.
- [ ] Access is revoked promptly when a team member leaves the project.
- [ ] Recovery email/phone is kept up to date and client-controlled.

## Onboarding / offboarding checklist

- [ ] Invite new admin via account invite (not credential copy).
- [ ] Confirm 2FA is enabled.
- [ ] Record role in the table above.
- [ ] On offboarding: remove invite, rotate any shared secrets, verify no
      personal email remains tied to client assets.

## Notes for the client

- The client should **legally own** the domain, hosting, and repository.
- The build team is added as an administrator/technical contact, never as the
  registrant.
- Keep registrar lock + auto-renewal on for the domain.
