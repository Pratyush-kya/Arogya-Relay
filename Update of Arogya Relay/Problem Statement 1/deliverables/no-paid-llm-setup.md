# Care Guidance — No-Paid-LLM-Key Setup

The Care Guidance assistant runs **fully offline with no API key and no paid
LLM**. The deterministic rules engine + curated knowledge pack produce a
complete, cited guidance object in the browser. The optional local model
(`@mlc-ai/web-llm`, Transformers.js/WebGPU) is a *planned* enhancement that
only attaches explanation text; it can never change the urgency tier.

## 1. Local development

```bash
# From the project root
npm install          # installs deps (vite is a required vinext peer dep)
npm run dev          # starts the Vite + Cloudflare dev server
```

Open the dashboard, click **Care guidance** in the sidebar, fill the structured
form, and choose **Offline pack**. Guidance appears instantly with no network
call.

## 2. Production build & test

```bash
npm run build       # production build (also runs the vinext/Sites pipeline)
npm test            # build + 19 unit/integration tests (7 dashboard + 12 clinical)
npm run lint        # ESLint
npm run db:generate # (optional) regenerate Drizzle migrations from db/schema.ts
```

## 3. Enabling D1 + R2 (no paid tier; Cloudflare free tier)

`.openai/hosting.json` already sets:

```json
{ "project_id": "…", "d1": "DB", "r2": "R2" }
```

Apply the schema to D1:

```bash
wrangler d1 execute DB --local --file=db/migrations/0001_care_guidance.sql
# for remote:
wrangler d1 execute DB --remote --file=db/migrations/0001_care_guidance.sql
```

R2 holds approved documents/model/knowledge-pack assets. No credit card is
required for the Cloudflare free tier; a custom domain (~$10/yr) is the only
optional paid item.

## 4. Online augmentation (optional, allow-listed)

Set `knowledge-mode` to **+ Online evidence** in the UI. The server adapter
(`lib/clinical/online-adapter.ts`) contacts **only** allow-listed national/WHO
hosts, with SSRF guards, timeouts, size/MIME checks, and de-identified concepts
(no patient text leaves the device). In the prototype the adapter returns an
empty list by default to preserve the offline-first guarantee; an operator
enables a specific allow-listed endpoint via configuration.

## 5. RBAC tokens (prototype only — replace with a real IdP)

The ingestion and signed-recommendation endpoints read `ADMIN_API_TOKEN` and
`DOCTOR_API_TOKEN` from the environment. **This is a placeholder**, not
production auth. A real deployment must use a vetted identity provider with
sessions, MFA and server-side RBAC.

```bash
export ADMIN_API_TOKEN="dev-admin-token"   # admin knowledge ingestion
export DOCTOR_API_TOKEN="dev-doctor-token" # doctor-only signed orders
```

## 6. Local model (optional, no key)

When benchmarking shows a small quantized, licence-compatible model runs on
realistic Android devices, add it in a dedicated Web Worker. Keep the
deterministic engine as the always-available fallback and reject invalid model
output in favour of the safe template.
