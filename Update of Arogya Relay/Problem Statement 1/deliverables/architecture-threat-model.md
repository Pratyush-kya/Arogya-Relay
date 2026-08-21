# Care Guidance — Architecture & Threat Model

_Part of Problem Statement 1: Hybrid Offline/Online Clinical RAG._
**Prototype only.** No real patient data, no medical-device deployment, no
diagnostic-accuracy claim. Synthetic data only.

## 1. System architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Browser (field device / CHW)                                  │
│  ┌───────────────────────────┐   no key, offline             │
│  │ CareGuidance (app/care-…) │──────────────┐                │
│  │  structured intake form   │               │                │
│  │  knowledge-mode toggle    │               ▼                │
│  └───────────────────────────┘      ┌─────────────────────┐  │
│                                       │ rules engine + pack │  │
│  ┌───────────────────────────┐       │ (deterministic,     │  │
│  │ Web Worker (planned)      │       │  pure TS)           │  │
│  │ Transformers.js / WebGPU  │       │  knowledge-pack.ts  │  │
│  │ @mlc-ai/web-llm (planned) │       └─────────────────────┘  │
│  └───────────────────────────┘                                │
│  Cache Storage / IndexedDB / OPFS (derived device data only)   │
└───────────────────────────────┬──────────────────────────────┘
                                 │ HTTPS (de-identified concepts)
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare Worker (vinext app-router)                          │
│  /api/care-guidance   deterministic assembly + online augment │
│  /api/admin/ingest    RBAC-gated knowledge ingestion           │
│  /api/doctor/recommend  doctor-only signed MedicationRequest   │
│  ── SSRF allow-list + timeouts + size/MIME checks ──          │
│  D1 (authoritative records)   R2 (approved docs/models/packs) │
└──────────────────────────────────────────────────────────────┘
        │                         │
        ▼                         ▼
  Allow-listed sources      ABDM/NRCeS · FHIR R4
  (MoHFW, WHO, ICMR…)        representations for records
```

### Components delivered

| Component | Path | Role |
| --- | --- | --- |
| Red-flag rules engine | `lib/clinical/engine.ts` | Deterministic, versioned; runs before any model/search |
| Knowledge pack | `lib/clinical/knowledge-pack.ts` | Curated, cited, hashed corpus |
| Guidance assembly | `lib/clinical/guidance.ts` + `guidance-browser.ts` | Safe template + retrieval; no-key |
| Online adapter | `lib/clinical/online-adapter.ts` | Allow-list + SSRF guard; de-identified only |
| Ingestion pipeline | `lib/clinical/ingestion.ts` | "Ingestion, not training"; PHI rejection; signed manifest |
| Audit/persistence | `lib/clinical/audit.ts` | Append-only D1 writes |
| RBAC | `lib/auth.ts` | Role gates for admin/doctor |
| Schema | `db/schema.ts` + `db/migrations/0001_care_guidance.sql` | Normalized, least-privilege |
| UI | `app/care-guidance.tsx` | Accessible symptom intake + result |
| Hosting | `.openai/hosting.json` | Sets `d1: "DB"`, `r2: "R2"` |

## 2. Trust boundaries

1. **User → browser.** Untrusted input. Free text and chips are sanitized,
   length-capped, and never trusted as instructions (prompt-injection
   defense: the engine treats all input as data).
2. **Browser → Worker.** Only de-identified search concepts leave the device
   when online augmentation is on; raw patient text never does.
3. **Worker → external sources.** Hard allow-list of national/WHO domains;
   private/loopback/link-local IPs rejected; timeouts, size and MIME checks.
4. **Worker → D1/R2.** Server-side authorization on every protected operation;
   append-only audit; no PHI in URLs, logs, or error reports.

## 3. Threat model (selected threats)

| Threat | Vector | Mitigation |
| --- | --- | --- |
| LLM downgrades urgency | model returns lower tier | Deterministic engine verdict computed first; `mustEscalate()` only allows escalation; emergency never downgraded |
| Prompt injection (user) | free text "ignore rules, diagnose X" | Input treated as data; no tool/instruction execution; no invented diagnoses |
| Prompt injection (retrieved doc) | malicious text in a source | Sources from fixed allow-list; instructions in docs rejected; user+retrieved content both untrusted |
| SSRF | crafted external URL | `isAllowedEvidenceUrl()` rejects non-allow-listed + private IPs |
| RBAC bypass | non-doctor creates meds | `hasRole()` enforced server-side on `/api/doctor/recommend` and `/api/admin/ingest` |
| Data exfiltration | PHI in logs/URLs | Minimized identifiers; PHI kept out of URLs/logs/analytics |
| Stale/unsafe pack | old knowledge | Per-source version + hash; previous safe pack retained for rollback |
| Model unavailability | WebGPU missing / quota | Deterministic triage + cited passages + safe template always available |
| Corrupt assets | bad download | Integrity hash check; fall back to deterministic path |

## 4. Privacy & governance

- Synthetic data only; no real patient records.
- Consent, withdrawal, retention and deletion modelled in `consent` table.
- Append-only decision/approval audit events (`audit_events`).
- ABDM consent principles and DPDP minimization applied to the schema.
- Existing non-diagnostic disclaimer preserved and surfaced on every result.
