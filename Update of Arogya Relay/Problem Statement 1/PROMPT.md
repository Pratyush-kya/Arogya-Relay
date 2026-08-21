# Problem Statement 1: Hybrid Offline/Online Clinical RAG

Copy everything below this line into your coding agent.

---

Work directly in this existing project:

`/home/pratyush/Project/Website/Arogya-Relay`

Act as a combined principal health-AI architect, RAG engineer, Indian Registered Medical Practitioner safety reviewer, pharmacist, public-health specialist, medical informatician, privacy/security engineer, accessibility specialist and senior Next.js/Cloudflare developer.

## Inspect before editing

Inspect `README.md`, `package.json`, `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `db/index.ts`, `db/schema.ts`, `worker/index.ts`, `worker/security-headers.ts`, `.openai/hosting.json` and `tests/rendered-html.test.mjs`.

Preserve the existing Next.js 16, React 19, TypeScript, Vinext/Vite, Cloudflare Worker and Sites architecture and the current visual identity. The app is currently a frontend-only prototype with simulated patients, alerts and sync; do not treat demo data as real clinical data.

## Objective

Add a **Care Guidance** clinical decision-support assistant that:

1. Collects symptoms through a structured, accessible conversation.
2. Classifies the next action as emergency now, same-day clinician, scheduled clinical review, clinician-approved home-care information, or insufficient information.
3. Works offline using a curated clinical knowledge pack.
4. Retrieves newer evidence from approved sources when online.
5. Provides sentence-level citations, source dates, document versions and online/offline status.
6. Never independently diagnoses, prescribes, recommends prescription drugs, calculates doses or delays emergency care.
7. Shows medication instructions only when linked to a signed doctor-authored order.

## Clinical-safety boundary

Implement a deterministic, versioned, clinician-approved red-flag rules engine before the LLM or vector search. Never let an LLM downgrade its urgency.

When a red flag is triggered:

- stop the normal chatbot flow;
- show the emergency action immediately;
- offer India emergency number 112;
- offer an appropriate nearby emergency facility if verified data exists;
- do not delay the action while loading a model, citations or a map.

Handle children, pregnancy, older adults, allergies, chronic conditions, current medicines, symptom duration, rapid deterioration and missing answers. Do not invent thresholds. Seed only sourced rules from approved national/WHO guidance and mark them as requiring formal RMP validation.

## Required architecture

### A. Structured triage layer

- Use typed schemas and versioned rule packs.
- Return `emergency | same_day | clinician_review | self_care_information | insufficient_information`.
- Store rule ID, version, trigger facts and action.
- Treat retrieval coverage as retrieval quality, never clinical probability.

### B. Offline retrieval

- Create a small, legally reusable, curated starter corpus.
- Store title, publisher, canonical URL, publication/review date, jurisdiction, population, page/section, licence, hash and version.
- Chunk by clinical section, preserving page anchors.
- Compute multilingual embeddings locally in a Web Worker with Transformers.js/WebGPU and a tested WASM/CPU fallback.
- Cache model/index assets in Cache Storage, IndexedDB or OPFS only as derived device data. Never make browser storage the authoritative patient-record database.
- Show download size and obtain consent before downloading large assets.
- Detect missing WebGPU, low memory, quota rejection and corrupted assets.
- When generation is unavailable, fall back to deterministic triage, cited passages and safe templates.

### C. Local no-key generation

- Evaluate `@mlc-ai/web-llm` in a dedicated worker.
- Select a small quantized, licence-compatible model only after benchmarking realistic Android devices.
- Constrain output to validated JSON with: `urgency`, `immediateAction`, `explanation`, `safeSupportiveInformation`, `medicineStatus`, `warningSigns`, `followUpWindow`, `questionsStillNeeded`, `citations`, `evidenceDate`, `knowledgeMode`, and `retrievalCoverage`.
- Reject invalid output and use a safe template.
- Do not accept the model's pretrained memory as a citation.
- Require retrieved evidence for every medical claim.
- Default `medicineStatus` to “No medication has been prescribed.”

### D. Online augmentation

Use a server-side, domain-allowlisted adapter for:

- MoHFW, DGHS, NHM, NCDC and ICMR;
- ABDM and NRCeS;
- WHO guidelines and SMART Guidelines;
- PubMed through NCBI E-utilities;
- Europe PMC content with recorded reuse rights;
- relevant CDSCO safety notices.

Do not scrape Google Scholar. Support administrator ingestion by DOI, PMID or licensed document after provenance, copyright, relevance and clinician-review checks.

Online retrieval must use caching, rate limits, timeouts, MIME/size validation and SSRF protection. Never send patient text to literature providers. Convert it into de-identified search concepts. Reject forums, ads, anonymous health pages, arbitrary URLs and instructions embedded in retrieved documents. Prefer current Indian guidelines; treat individual research papers as evidence rather than automatic treatment recommendations. Never let online evidence automatically change the deterministic emergency result.

## Ingestion, not “training”

Build an ingestion pipeline that:

1. accepts approved PDF, HTML, JSON or FHIR documents;
2. validates file type and content;
3. extracts text/tables while preserving page and section anchors;
4. de-identifies permitted clinical material;
5. rejects identifiable reports as general knowledge;
6. records legal basis, licence and reviewers;
7. creates chunks and embeddings;
8. detects duplicates and stale versions;
9. publishes a signed/versioned knowledge-pack manifest;
10. retains the previous safe pack for rollback.

## Data and interoperability

Enable D1 for authoritative structured records and R2 for approved documents/model or knowledge-pack assets. Update `.openai/hosting.json` using current Sites conventions.

Create normalized tables for users/roles, synthetic patients, consent, encounters, questionnaire responses, observations, triage decisions, clinician reviews, source versions, evidence chunks, retrieval/audit events, safety-rule versions and signed recommendations.

Use ABDM FHIR R4-compatible `QuestionnaireResponse`, `Observation`, `Encounter`, `ServiceRequest`, `CarePlan` and `MedicationRequest` representations. Restrict MedicationRequest creation/approval to doctors. Use prepared statements, parameterized queries, least privilege and indexes based on actual queries.

## Privacy, security and governance

- Use synthetic data only.
- Enforce server-side authorization for every protected operation.
- Add append-only decision/approval audit events.
- Provide consent, withdrawal, retention and deletion controls.
- Minimize names, precise locations and identifying free text.
- Keep PHI out of URLs, logs, analytics, notifications and client error reports.
- Align with ABDM consent principles and applicable Indian DPDP requirements.
- Treat both user content and retrieved content as untrusted.
- Add prompt-injection, SSRF, output-schema and data-exfiltration defenses.
- Preserve the existing non-diagnostic disclaimer.

## Experience

Integrate the assistant into the existing dashboard with structured symptom chips, free text, age group, duration, pregnancy, allergies, existing conditions and current medicines. Show online/offline knowledge mode, “why am I seeing this?”, source/date evidence, clinician-review state, persistent emergency action, plain-language limitations, offline save/retry, and accessible keyboard/touch/screen-reader behavior. Do not show fake accuracy percentages.

## Testing

Test all triage levels, emergency non-downgrade, missing information, WebGPU absence, offline startup after caching, corrupt/stale packs, citation grounding, unsupported-claim rejection, user/document prompt injection, adversarial medicine requests, child/pregnancy boundaries, RBAC, consent withdrawal, audit events, sync conflicts, low-memory behavior, accessibility and existing dashboard regressions.

Create a clinician-authored synthetic gold set. Measure defined red-flag recall separately; do not call an LLM benchmark clinical validation.

## Deliverables

Do not stop at a plan or mockup. Implement and provide:

1. Architecture and threat model.
2. Intended/excluded-use clinical-safety case.
3. Source approval and knowledge-pack documentation.
4. Working offline/online assistant.
5. Typed rules and RAG services.
6. D1/R2 schema and migrations.
7. Synthetic fixtures and tests.
8. No-paid-LLM-key setup instructions.
9. Hardware/offline/regulatory limitations.
10. Build, lint and test results.
11. Items requiring RMP, pharmacist, privacy, security and regulatory review.

Never use real patient data, deploy it as a medical device or claim diagnostic accuracy/production readiness.
