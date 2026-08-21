# Problem Statement 4 — Doctor Schedules, Medicines & Care Reminders

## What was built

A clinician-controlled **Care Plan & Reminder** system: a doctor care-plan editor,
a patient daily schedule, an offline-first scheduling/safety/FHIR/sync engine, D1
(Drizzle) schema + SQL migration, ICS + printable fallback, and a Web Push adapter
architecture.

### Files

| File | Purpose |
| --- | --- |
| `lib/careplan/types.ts` | FHIR R4-aligned domain types, roles, safety tiers. |
| `lib/careplan/scheduling.ts` | Pure scheduling engine (recurring/one-time/taper/weekday/interval/PRN/ambiguous/paused) with a fake clock + idempotent reminder ids + conflict resolution. |
| `lib/careplan/safety.ts` | Authorization (doctor-only), completeness/ambiguity blocking, duplicate + allergy checks, high-risk flag, missed-dose default, caregiver scope. |
| `lib/careplan/fhir.ts` | FHIR R4 mappers (MedicationRequest/CarePlan/Appointment), ICS export (generic titles), PushAdapter contract + production note. |
| `db/schema.ts` | Extended with `care_plans`, `medication_orders`, `care_items`, `reminder_instances`, `caregiver_grants`, `push_subscriptions`, `pending_sync`. |
| `db/migrations/0002_care_plan.sql` | Matching D1 SQL migration. |
| `app/care-plan.tsx` | Doctor editor + patient daily schedule UI (demo data). |
| `app/page.tsx` | New "Care plan" nav tab wired in. |
| `tests/care-plan.test.mts` | 21 tests (fake clock, safety, authorization, scheduling, FHIR/ICS). |

## Authoritative workflow enforced

Only an authorised doctor (or admin) may create/approve/change/pause/discontinue a
`MedicationRequest`. `assertCanPrescribe` throws `AuthorizationError` otherwise. The
chatbot/assistant path is explicitly blocked from mutating orders. Ambiguous
schedules are BLOCKED and returned to the clinician — the engine never infers a
schedule from free text. PRN medicines get NO ordinary scheduled-dose reminders
unless the prescriber defines safe conditions + a daily max.
