# Problem Statement 4: Doctor Schedules, Medicines and Care Reminders

Copy everything below this line into your coding agent.

---

Work directly in:

`/home/pratyush/Project/Website/Arogya-Relay`

Act as a combined medication-safety pharmacist, Indian RMP workflow designer, nursing informatics specialist, patient-adherence researcher, FHIR architect, privacy/security engineer, notification engineer and senior Next.js/Cloudflare developer.

Inspect the application, database scaffolding, worker, hosting configuration and tests before editing. Preserve the existing offline-first design and runtime.

## Objective

Build a clinician-controlled **Care Plan and Reminder** system for medicine timing, appointments, hospital visits, investigations, follow-ups, refills, symptom check-ins, prescribed activities and consented caregiver reminders.

The system must not prescribe, change doses or present a reminder as proof that medicine was taken.

## Authoritative workflow

Only an authorised doctor may create, approve, change, pause or discontinue a prescription instruction.

1. Doctor creates/imports a care plan.
2. System validates completeness and flags ambiguity.
3. Doctor confirms patient, medicine, dose, route, frequency, dates, indication and instructions.
4. Doctor signs it.
5. Patient/health worker reviews it in their language.
6. Patient enables reminders.
7. Updates invalidate obsolete reminders and create audit events.
8. Discontinued medicine immediately stops future reminders.

The chatbot cannot create or modify a `MedicationRequest`; it may explain a signed instruction using approved content.

## Data and FHIR

Use ABDM-compatible FHIR R4 concepts where appropriate: `MedicationRequest`, `Medication`, `CarePlan`, `Appointment`, `ServiceRequest`, `Task`, `Observation`, `Patient` and `Practitioner` references.

Enable D1 as the authoritative database. Add normalized records for patients, practitioners/roles, medication orders, dose schedules, appointments, activities, preferences, push subscriptions, caregiver permissions, reminder instances, acknowledgements, self-reported adherence, schedule changes, consent and audit events.

Use R2 only for approved prescription documents; keep metadata/ownership in D1. Use structured fields rather than parsing free text when reminders fire.

## Offline-first behavior

- Cache the current signed plan securely for offline viewing.
- Queue acknowledgements with idempotency keys.
- Show unsynchronized actions.
- Resolve conflicts safely; the current signed server order wins over a stale local schedule.
- Invalidate obsolete cached reminders after sync.
- Never use localStorage as the authoritative clinical record.
- Keep PHI out of URLs and cache keys.

## Scheduling

Support fixed times, frequencies, weekdays, start/end, explicitly authored tapers, food relationships, one-time doses, appointment preparation, tests, refills, timezone changes, midnight boundaries and paused hospitalisation periods.

PRN/as-needed medicines must not receive ordinary scheduled-dose reminders unless the prescriber explicitly defines safe conditions and limits. Block ambiguous schedules and return them to the clinician; never infer a schedule from unclear free text.

## Reminder channels

### In-app

Show upcoming, due, missed and completed items while the app is open.

### PWA/service worker

Ask for permission only after opt-in. Use persistent notifications where supported. Use privacy-safe generic lock-screen content by default; reveal medicine names only after explicit consent. Provide Taken, Snooze and Skip actions only where supported.

### Server Web Push

Use standards-based Web Push and VAPID credentials stored as hosted secrets, never committed files. Protect subscriptions and delete expired ones. Use server scheduling only if scheduled worker execution is verified in the current hosting platform. Otherwise build a scheduler adapter and explicitly document the unverified production dependency. Never simulate reliable scheduling with long browser `setTimeout` calls.

### Calendar and print fallback

Export ICS events without sensitive titles by default and provide a printable daily chart.

### Native reliability path

Document a future Capacitor/native Android layer using OS local notifications for deployments requiring dependable offline alarms. State clearly that a web-only PWA cannot guarantee an exact alarm after the OS/browser terminates background activity.

## Medication safety

Show the exact prescribed medicine, strength/form, dose, route, time, food relation, dates and doctor-authored instructions.

Do not invent missed-dose advice. Store approved advice per order. If absent, show: “Do not double the next dose. Contact your doctor or pharmacist for instructions.”

Do not build an LLM drug-interaction checker. A real checker requires a validated, licensed and maintained drug knowledge source. Mark it unavailable unless such a source is verified.

Include allergy confirmation, duplicate active-order warnings, clinician-controlled high-risk flags, entered pregnancy/child context, reconciliation at transitions of care, severe-side-effect escalation and consent-controlled caregiver access.

## Acknowledgement and adherence

Offer Taken, Snoozed, Skipped, Could not obtain medicine, Side effect/problem and Unsure. Mark Taken as self-reported, never verified ingestion.

Provide non-judgmental daily/weekly views. Separate missing information from skipped doses in clinician summaries. Repeated-miss escalation must follow a clinician-defined plan and consent; never automatically contact caregivers/clinicians without it.

## Appointments and quality-of-life features

Add appointment reminders, preparation checklists, documents to carry, clinician-authored fasting/test instructions, travel-time prompts through Nearby Care, refill countdown, patient-corrected stock estimates, caregiver sharing, printable schedules, large-text mode, multilingual read-aloud, rescheduling requests, post-visit tasks and a care-plan-linked symptom diary. Emergency warning signs must bypass normal reminder screens.

## Privacy and authorization

- Enforce patient, doctor, health-worker, caregiver and admin permissions server-side.
- Make caregiver scope revocable and audited.
- Keep notifications private by default.
- Do not expose patient/medicine IDs in URLs.
- Audit every clinical schedule change.
- Provide consent withdrawal, export and deletion subject to retention duties.
- Use synthetic data only and follow applicable DPDP/ABDM principles.

## Multilingual behavior

Use the project language registry. Preserve medicine names, strengths, numbers and units. Tier 1 translated instructions must come from approved packs. Record the language and version accepted by the patient.

## Testing

Use fake clocks and synthetic orders. Test doctor-only approval, unauthorised changes, activation/discontinuation, recurring/one-time/taper schedules, timezones, midnight, duplicate delivery, expired push subscriptions, denied notification permission, offline sync, stale conflicts, discontinued orders, ambiguous blocking, PRN behavior, private notification text, caregiver consent/revocation, missed-dose wording, multilingual dose preservation, accessibility and regressions.

## Deliverables

Implement and provide:

1. Doctor care-plan editor.
2. Patient daily schedule.
3. D1 schema and migrations.
4. FHIR-compatible mapping.
5. In-app/PWA/Web Push adapter architecture.
6. ICS and printable fallback.
7. Offline sync/conflict handling.
8. Medication-safety controls.
9. Patient/caregiver consent and authorization.
10. Scheduling/security/accessibility tests.
11. Documentation separating guaranteed from best-effort behavior.
12. Production checklist for RMP, pharmacist, privacy, security and regulatory review.
13. Build, lint and test results.

Do not claim notifications prove adherence, invent prescriptions or describe a web reminder as a guaranteed medical alarm.
