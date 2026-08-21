## Guaranteed vs best-effort behavior

**Guaranteed (works in this prototype):**
- Doctor-only signing gated by `assertCanPrescribe`; assistant cannot mutate orders.
- Ambiguous/empty orders are not signable; blocking issues surface in the UI.
- Scheduling math (recurring, one-time, taper, weekday, interval, paused) is
  deterministic and unit-tested with a fake clock.
- PRN orders produce no ordinary scheduled-dose reminders.
- Duplicate active-order and allergy conflicts are flagged before sign.
- Missed-dose advice falls back to the safe default when not clinician-authored.
- ICS export uses generic, privacy-safe titles by default.
- Medicine names/strengths/doses are preserved exactly (never translated).
- Caregiver receive/view scope is revocable and auditable.

**Best-effort / not verified (documented, must not be over-claimed):**
- Web Push / server scheduling depends on verified scheduled-worker execution in the
  hosting platform. NOT verified here — treat as best-effort.
- PWA persistent notifications depend on browser/OS support and permission.
- A web-only PWA cannot guarantee an exact alarm after OS/browser terminates
  background activity. A future Capacitor/native Android layer (OS-local
  notifications) is the dependable offline path.
- Reminders are NOT proof of adherence; "Taken" is self-reported, never verified
  ingestion.
- No LLM drug-interaction checker is built; such a checker requires a validated,
  licensed, maintained knowledge source.

## Production checklist (RMP / pharmacist / privacy / security / regulatory)

- [ ] RMP signs every MedicationRequest; signature stored + audited.
- [ ] RBAC enforced server-side (patient/doctor/health-worker/caregiver/admin).
- [ ] DPDP/ABDM-aligned consent withdrawal, export, deletion with retention duties.
- [ ] PHI kept out of URLs, cache keys, and lock-screen notification text.
- [ ] VAPID secrets stored as hosted secrets, never committed.
- [ ] Expired push subscriptions pruned; subscriptions deletable.
- [ ] Conflict resolution: signed server order wins over stale local schedule.
- [ ] Medication-safety review: allergy confirmation, duplicate warnings, high-risk
      flags, pregnancy/child context, reconciliation at transitions of care.
- [ ] Validated drug-interaction source before any checker is enabled.
- [ ] Clinical safety + regulatory review before any real-patient deployment.

## Verification

- `npm run build` ✅ · `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `npm test` ✅ (65 tests)
- 21 PS4-specific tests cover scheduling, authorization, safety, FHIR/ICS, conflict.
