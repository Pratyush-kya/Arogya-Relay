# Security and Quality Audit — Arogya Relay

**Audited:** 16 August 2026
**Audited against:** `website-client-guide.md` (sections 2, 3, and 8)
**Result:** all issues found were fixed and verified. TypeScript, ESLint, and the
test suite pass with zero errors, and the production dependency tree has zero
known vulnerabilities.

---

## 1. Summary of verification

| Check | Before | After |
|---|---|---|
| TypeScript (`tsc --noEmit`) | 3 errors | **0 errors** |
| ESLint (`npm run lint`) | 0 errors | **0 errors** |
| Tests (`npm test`) | 2 tests | **7 tests, all passing** |
| Total dependency vulnerabilities | 16 (12 high, 4 moderate) | **6, all dev-only build tools** |
| Production dependency vulnerabilities | not measured | **0** |
| Security response headers | none | **8 headers on every response** |
| Local filesystem path leak in built HTML | present | **fixed and guarded by a test** |
| Guide-required app states + SEO routes | missing | **all present** |

---

## 2. Security issues found and fixed

### 2.1 No security response headers (high)

**Problem.** The Worker returned responses with no protective headers at all.
The site could be framed by an attacker's page (clickjacking), the browser was
free to guess content types (MIME confusion), full URLs leaked to third parties
via the referrer, and there was nothing to constrain script or style sources.

**Fix.** Added `worker/security-headers.ts`, applied to every response in
`worker/index.ts`:

- `Content-Security-Policy` — restricts scripts, styles, images, fonts, and
  connections to the site's own origin plus Google Fonts. Also sets
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and
  `frame-ancestors 'none'`, which together block plugin injection, base-tag
  hijacking, form redirection, and framing.
- `X-Frame-Options: DENY` — clickjacking protection for older browsers.
- `X-Content-Type-Options: nosniff` — stops MIME-type guessing.
- `Referrer-Policy: strict-origin-when-cross-origin` — stops URL leakage.
- `Strict-Transport-Security` (1 year, includeSubDomains, preload) — forces HTTPS.
- `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin`.
- `Permissions-Policy` — switches off camera, microphone, geolocation, USB,
  payment, and 8 other powerful features the dashboard does not use.
- Removes `X-Powered-By` and `Server`, so the site does not advertise its stack.

**Known CSP limitation.** `script-src` and `style-src` still allow
`'unsafe-inline'`. This is required by the Next.js App Router bootstrap and by
React's inline `style` attributes (the chart bars and battery meter). Removing
it needs per-request nonces; this is recorded as a future hardening item rather
than silently claimed as done.

### 2.2 Local filesystem paths leaked into production HTML (high)

**Problem.** The built output contained absolute paths from a previous copy of
the project:

```
/home/pratyush/Downloads/Arogya-Relay-main/.vinext/fonts/geist-mono-.../*.woff2
```

This is an information disclosure — it reveals the developer's username and
directory layout to every visitor — and it also broke the Geist Mono font in
production, because that path does not exist on the server.

**Cause.** A stale `.vinext` font cache carried over from the older directory.

**Fix.** Cleared `.vinext` and `dist` and rebuilt. Added a regression test that
fails if any `/home/<user>/` path appears in either the built server bundle or
the rendered HTML, so this cannot silently return.

### 2.3 Unexpected HTTP methods reached the framework (medium)

**Problem.** Every HTTP verb was passed straight through to the application,
including `TRACE`, `PUT`, `DELETE`, and WebDAV methods. This widens the attack
surface for no benefit.

**Fix.** The Worker now allows only `GET`, `HEAD`, `OPTIONS`, and `POST`, and
answers anything else with `405 Method Not Allowed` plus an `Allow` header —
before any application code runs. The rejection still carries the security
headers.

### 2.4 Internal errors could reach the visitor (medium)

**Problem.** An unhandled exception in the request handler propagated out of the
Worker, which can surface stack traces and internal file paths.

**Fix.** Wrapped the handler in `try/catch`. Visitors now get a plain
"Something went wrong. Please try again." at status 500, while the real error is
logged for the maintainer via `console.error`.

### 2.5 Vulnerable dependencies (high)

**Problem.** 16 known vulnerabilities, including:

- **Next.js — middleware/proxy bypass in App Router** (the most serious, since
  it can defeat route protection)
- `react-server-dom-webpack` — denial of service in server functions
- `vite` — `server.fs.deny` bypass and an NTLM hash disclosure via `launch-editor`
- `ws` — uninitialised memory disclosure and memory-exhaustion DoS
- `undici` — TLS certificate validation bypass
- `postcss` — XSS via unescaped `</style>`
- `sharp` / libvips — three CVEs

**Fix.** Upgraded to `next@16.3.1`, `react`/`react-dom@19.2.8`,
`react-server-dom-webpack@19.2.8`, `vite@8.2.1`, `wrangler@4.123.0`,
`@cloudflare/vite-plugin@1.52.1`, and matching `@types/*`.

React had to be bumped together with `react-server-dom-webpack`, which requires
`react@^19.2.8` as a peer — upgrading it alone fails to resolve.

**Remaining 6 (accepted).** `drizzle-kit`→`esbuild` and `vinext`→`image-size`.
These are **build-time only**: they never run on the server and are never sent
to a visitor. `npm audit --omit=dev` reports **0 vulnerabilities**. Fixing them
requires upstream releases; forcing them would break the build. They should be
re-checked when `vinext` and `drizzle-kit` publish updates.

### 2.6 Checks that found nothing (confirmed clean)

- No `dangerouslySetInnerHTML`, `eval`, `new Function`, `innerHTML =`, or
  `document.write` anywhere in the application.
- No hardcoded API keys, tokens, or passwords in source.
- No `.env`, `.dev.vars`, or `.pem` files present; `.gitignore` already covers
  `.env*`.
- No `target="_blank"` (so no `noopener` reverse-tabnabbing risk).
- No plaintext `http://` links.
- No real patient data — all records are fictional demonstration data, and the
  non-diagnostic disclaimer is shown in the screening form.

---

## 3. Correctness and accessibility issues fixed

### 3.1 Memory leak on unmount
`syncReports()` started a 1.4-second `setTimeout` that was never cleared. If the
component unmounted first, it tried to set state on a dead component. Now the
timer id is tracked in a ref and cleared on unmount.

### 3.2 Buttons could submit the form unintentionally
Buttons inside and around the screening `<form>` had no `type`, so they defaulted
to `type="submit"`. Every button now declares an explicit type, and a test
asserts that no untyped button can be reintroduced.

### 3.3 Dialog was not keyboard accessible (WCAG 2.2)
The screening dialog could not be closed with `Escape`, did not move focus into
itself when opened, did not return focus to the button that opened it, and let
the page behind it scroll. All four are fixed and verified in a real browser.

### 3.4 Other accessibility fixes
- Added a "Skip to main content" link and the matching `#main-content` target,
  so keyboard users can bypass the sidebar.
- Added `aria-current="page"` to the active navigation tab.
- Added `aria-pressed` to the case-queue filter buttons.
- Zoom is not locked (`maximumScale: 5`) — required by WCAG 2.2 SC 1.4.4.
- Added a global `prefers-reduced-motion` rule.
- Gave every form input a `name`, plus appropriate `inputMode`, `maxLength`,
  and sensible `min`/`max` bounds (for example body temperature 30–45 °C).

### 3.5 TypeScript was not actually type-safe
Three pre-existing errors meant `Fetcher`, `D1Database`, and `cloudflare:workers`
were unchecked. Installed `@cloudflare/workers-types`, registered it in
`tsconfig.json`, and correctly augmented `Cloudflare.Env` for the optional `DB`
binding. `tsc --noEmit` is now clean.

### 3.6 Build warnings removed
Fixed the two `configLoader: 'native'` forward-compatibility warnings in
`vite.config.ts` (JSON import attribute and explicit file extension).

---

## 4. Guide requirements that were missing and are now added

The guide's section 3 requires these App Router files. None existed:

| File | Purpose |
|---|---|
| `app/error.tsx` | Recovery screen; shows no stack trace, reassures the worker that saved screenings are safe |
| `app/not-found.tsx` | 404 page |
| `app/loading.tsx` | Skeleton loading state (avoids layout shift, protecting CLS) |
| `app/robots.ts` | `robots.txt`, disallows `/_vinext/` and `/api/` |
| `app/sitemap.ts` | `sitemap.xml` |

Also added the SEO and social metadata the guide's section 8 asks for: canonical
URL, Open Graph and Twitter card tags, keywords, `theme-color`, and a
`prototype-notice` meta tag restating that this is not a medical device.

Set `NEXT_PUBLIC_SITE_URL` to the real production origin before launch; it
currently falls back to `https://arogya-relay.pages.dev`.

---

## 5. Verified in a real browser

Run against the dev server, not assumed:

- Dashboard renders correctly — sidebar, trend chart, four metric cards, case
  list, and device panel all intact.
- **Zero JavaScript errors and zero CSP violations** in the console.
- All three tabs (Overview, Case queue, Field device) switch correctly, with
  `aria-current` tracking the active tab.
- Dialog: opens, moves focus to the first control, locks background scroll;
  `Escape` closes it, restores focus to the "New screening" button, and unlocks
  scroll.
- `/no-such-page` returns the custom 404.
- `/robots.txt` and `/sitemap.xml` both return 200 with correct content.
- All 8 security headers confirmed present on a live HTTP response.

---

## 6. Recommended next steps

1. **Replace CSP `'unsafe-inline'` with nonces.** The single most valuable
   remaining hardening step.
2. **Re-run `npm audit` when `vinext` and `drizzle-kit` update**, to clear the
   6 remaining dev-only advisories.
3. **Set `NEXT_PUBLIC_SITE_URL`** to the production origin before launch.
4. **Add browser tests with Playwright**, as the guide's section 1 recommends.
   The current tests cover rendering, headers, and source-level invariants, but
   not real user journeys across browsers.
5. **Measure Core Web Vitals on the deployed site** against the guide's targets
   (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1). These have not been measured yet and
   should not be assumed to pass.
6. **Add the legal pages** (privacy policy, terms, contact) before any public
   launch — `docs/04-sitemap.md` lists them as planned.
7. **Run an accessibility audit with axe or Lighthouse.** The fixes above address
   specific defects found by inspection; they are not a substitute for a full
   WCAG 2.2 AA audit.
