# Care Guidance — Intended & Excluded-Use Clinical-Safety Case

**Prototype / research only.** Not a certified medical device. No real patient
data. All records synthetic. Requires formal RMP, pharmacist, privacy, security
and regulatory review before any real-patient pilot.

## Intended use

- A **screening-support / decision-support** assistant for community health
  workers and clinicians operating in low-connectivity settings.
- Collects symptoms through a structured, accessible conversation.
- Classifies the next action into one of five tiers:
  `emergency | same_day | clinician_review | self_care_information | insufficient_information`.
- Works **offline** from a curated clinical knowledge pack, and augments with
  **allow-listed** online evidence when connectivity is available.
- Provides sentence/section-level citations, source dates, versions and
  online/offline status.
- Shows medication instructions **only** when linked to a signed,
  doctor-authored order.

## Excluded use (hard boundaries)

The assistant MUST NOT, under any configuration:

- Independently diagnose a condition.
- Prescribe, recommend prescription drugs, or calculate doses.
- Delay emergency care for any reason (model load, citations, map, network).
- Present a fake accuracy / confidence / probability percentage. `retrievalCoverage`
  is explicitly a measure of *knowledge-pack coverage*, never clinical probability.
- Treat retrieved or model-pretrained text as a citation; every citation links
  to a sourced, versioned, clinician-approved rule/source.
- Store browser storage as the authoritative patient-record database.
- Be deployed as a medical device or claimed production-ready.

## Safety architecture (why it is safe-by-construction)

1. **Deterministic red-flag engine first.** `lib/clinical/engine.ts` evaluates
   versioned rules (IMCI, WHO ETAT, MoHFW, WHO ANC/mhGAP, AHA) *before* any
   model or vector search. On a red flag the normal flow stops and the
   emergency action is shown immediately with India number **112**.
2. **No downgrade.** `mustEscalate()` permits only escalation of the
   deterministic verdict. Online evidence may only *raise* triage; it can never
   lower an emergency result.
3. **Populations handled.** Children, pregnancy, older adults, allergies, chronic
   conditions, current medicines, duration, rapid deterioration and missing
   answers are explicit inputs. Thresholds are sourced, not invented, and every
   rule is tagged `requiresRmpValidation: true`.
4. **Medication gating.** `medicineStatus` defaults to "No medication has been
   prescribed." Only a doctor-signed order (separate, RBAC-gated endpoint) can
   change it.
5. **Ungrounded-claim rejection.** Every medical claim must trace to a retrieved,
   cited source; unsupported claims fall back to safe templates.

## Validation status

- A **synthetic clinician-authored gold set** (`tests/clinical-engine.test.mts`)
  verifies the engine returns the correct urgency tier for each seeded case and
  that **red-flag recall is complete** (every emergency seed → `emergency`).
- Tests cover emergency non-downgrade, missing information, child/pregnancy
  boundaries, adversarial medicine requests, and user/document prompt injection.
- **This is a software test oracle, NOT clinical validation.** An LLM benchmark
  is explicitly NOT used as clinical validation. Real clinical validation
  requires a Registered Medical Practitioner and a regulated study.

## Items requiring review (sign-off list)

- [ ] Registered Medical Practitioner — approve every rule threshold and wording.
- [ ] Pharmacist — confirm medication-information gating and signed-order path.
- [ ] Privacy officer — DPDP / ABDM consent and minimization review.
- [ ] Security assessor — threat model, SSRF, RBAC, audit completeness.
- [ ] Regulatory — medical-device classification in each deployment region.
