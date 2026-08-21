# Contributing to Arogya Relay

Use synthetic demonstration data only. Do not add real names, patient records,
phone numbers, coordinates, prescriptions, credentials, tokens, or private
clinical documents to code, screenshots, fixtures, issues, or pull requests.

## Development

1. Create a branch from `main`.
2. Copy `.env.example` to `.env.local` only when an API gate is required.
3. Install with `npm ci` and run with `npm run dev`.
4. Keep safety-critical copy explicit: screening support is not diagnosis, and
   clinician review is required for medicine orders.
5. Run `npm run check` before opening a pull request.

## Pull requests

Describe the user-visible change, security/privacy impact, accessibility impact,
and tests performed. Keep changes focused and include screenshots only when they
contain synthetic data. Never weaken authentication, input validation, CSP,
permissions policy, or clinical safety wording for convenience.
