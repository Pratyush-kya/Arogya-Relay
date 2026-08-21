/**
 * Arogya Relay care-plan tests (Problem Statement 4).
 * Run via: npm test
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  medicationDueTimes,
  buildReminders,
  resolveConflict,
  activeTaperStep,
  DEFAULT_MISSED_DOSE_ADVICE,
} from "../lib/careplan/scheduling.ts";
import {
  assertCanPrescribe,
  AuthorizationError,
  validateOrderCompleteness,
  isSignable,
  findDuplicateActiveOrders,
  allergyConflict,
  missedDoseAdviceFor,
  caregiverCanReceive,
  signOrderPayload,
} from "../lib/careplan/safety.ts";
import { toICS, toFhirMedicationRequest } from "../lib/careplan/fhir.ts";
import type { MedicationOrder, PatientRef } from "../lib/careplan/types.ts";

const patient: PatientRef = { id: "pt-1", reference: "NR-1", ageGroup: "adult", allergies: ["penicillin"] };
const doctor = { id: "dr-1", role: "doctor" as const };
const baseOrder = (over: Partial<MedicationOrder> = {}): MedicationOrder => ({
  id: "mo-1",
  carePlanId: "cp-1",
  patientId: "pt-1",
  medicine: "Paracetamol",
  strength: "500 mg",
  form: "tablet",
  dose: "1 tablet",
  route: "oral",
  frequency: { kind: "times_per_day", times: 2 },
  foodRelation: "after_food",
  indication: "Fever",
  instructions: "After food",
  startDate: "2026-08-20",
  endDate: "2026-08-27",
  signedByDoctorId: "dr-1",
  signedAt: "2026-08-20T08:00:00",
  signature: "sig",
  status: "active",
  createdAt: "2026-08-20T08:00:00",
  updatedAt: "2026-08-20T08:00:00",
  version: 1,
  ...over,
});
// ── Scheduling (fake clock) ───────────────────────────────────────────────
test("times_per_day produces N daily slots", () => {
  const o = baseOrder({ frequency: { kind: "times_per_day", times: 3 } });
  const due = medicationDueTimes(o, "2026-08-21T00:00:00", "2026-08-21T23:59:59");
  assert.equal(due.length, 3);
  assert.deepEqual(due.map((d) => d.slice(11, 13)), ["09", "15", "21"]);
});

test("one-time dose yields a single slot on startDate only", () => {
  const o = baseOrder({ frequency: { kind: "once" }, startDate: "2026-08-21", endDate: "2026-08-27" });
  const due = medicationDueTimes(o, "2026-08-21T00:00:00", "2026-08-27T23:59:59");
  assert.equal(due.length, 1);
  assert.equal(due[0], "2026-08-21T09:00:00Z");
});

test("weekdays only schedule on selected days", () => {
  // 2026-08-24 is a Monday (dow 1). Select Mon/Wed/Fri. Order ends 2026-08-27,
  // so within the window 24..30 only Mon(24) and Wed(26) qualify (Fri 28 is past
  // the order end date).
  const o = baseOrder({ frequency: { kind: "weekdays", days: [1, 3, 5] }, startDate: "2026-08-24", endDate: "2026-08-27" });
  const due = medicationDueTimes(o, "2026-08-24T00:00:00", "2026-08-30T23:59:59");
  assert.equal(due.length, 2);
  assert.deepEqual(due.map((d) => d.slice(0, 10)), ["2026-08-24", "2026-08-26"]);
});

test("every_hours wraps across the day", () => {
  const o = baseOrder({ frequency: { kind: "every_hours", hours: 8 } });
  const due = medicationDueTimes(o, "2026-08-21T00:00:00", "2026-08-21T23:59:59");
  assert.equal(due.length, 3); // 00, 08, 16
});

test("interval schedules every N days from startDate", () => {
  const o = baseOrder({ frequency: { kind: "interval", everyDays: 3 }, startDate: "2026-08-20" });
  const due = medicationDueTimes(o, "2026-08-20T00:00:00", "2026-08-27T23:59:59");
  assert.equal(due.length, 3); // 20, 23, 26
});

test("PRN orders produce NO scheduled-dose reminders", () => {
  const o = baseOrder({ frequency: { kind: "prn", maxPerDay: 4, condition: "fever > 38" } });
  const due = medicationDueTimes(o, "2026-08-21T00:00:00", "2026-08-21T23:59:59");
  assert.equal(due.length, 0);
});

test("ambiguous frequency is blocked (no reminders)", () => {
  const o = baseOrder({ frequency: { kind: "ambiguous" } });
  const due = medicationDueTimes(o, "2026-08-21T00:00:00", "2026-08-21T23:59:59");
  assert.equal(due.length, 0);
});

test("paused/discontinued orders produce no reminders", () => {
  const paused = baseOrder({ status: "paused" });
  const disc = baseOrder({ status: "discontinued" });
  assert.equal(medicationDueTimes(paused, "2026-08-21T00:00:00", "2026-08-21T23:59:59").length, 0);
  assert.equal(medicationDueTimes(disc, "2026-08-21T00:00:00", "2026-08-21T23:59:59").length, 0);
});

test("reminders classify upcoming/due/missed relative to now", () => {
  const o = baseOrder({ frequency: { kind: "times_per_day", times: 3 } });
  const out = buildReminders({
    orders: [o],
    items: [],
    windowStart: "2026-08-21T00:00:00Z",
    windowEnd: "2026-08-21T23:59:59Z",
    now: "2026-08-21T10:00:00Z",
  });
  const states = out.map((r) => r.state).sort();
  assert.ok(states.includes("upcoming")); // 15:00, 21:00
  assert.ok(states.includes("due")); // 09:00 within 2h
});

test("paused hospitalization window suppresses reminders", () => {
  const o = baseOrder({ frequency: { kind: "times_per_day", times: 2 } });
  const out = buildReminders({
    orders: [o],
    items: [],
    windowStart: "2026-08-21T00:00:00Z",
    windowEnd: "2026-08-21T23:59:59Z",
    now: "2026-08-21T10:00:00Z",
    pausedFrom: "2026-08-21T00:00:00Z",
    pausedTo: "2026-08-21T23:59:59Z",
  });
  assert.equal(out.length, 0);
});

test("active taper step overrides dose label on a date", () => {
  const o = baseOrder({
    frequency: { kind: "times_per_day", times: 2 },
    tapers: [{ fromDate: "2026-08-21", toDate: "2026-08-23", dose: "2 tablets", timesPerDay: 2 }],
  });
  const step = activeTaperStep(o, "2026-08-22");
  assert.equal(step?.dose, "2 tablets");
  assert.equal(activeTaperStep(o, "2026-08-25"), null);
});

test("conflict resolution: signed server order wins over stale local", () => {
  const local = baseOrder({ version: 1 });
  const server = baseOrder({ version: 3 });
  const { winner, stale } = resolveConflict(local, server);
  assert.equal(winner.version, 3);
  assert.equal(stale, true);
});

// ── Authorization & safety ────────────────────────────────────────────────
test("only doctors may prescribe", () => {
  assertCanPrescribe(doctor);
  assert.throws(() => assertCanPrescribe({ id: "x", role: "patient" }), AuthorizationError);
  assert.throws(() => assertCanPrescribe({ id: "x", role: "health_worker" }), AuthorizationError);
});

test("ambiguous/empty orders are not signable; complete orders are", () => {
  const bad = baseOrder({ frequency: { kind: "ambiguous" }, indication: "" });
  assert.equal(isSignable(bad), false);
  assert.ok(validateOrderCompleteness(bad).some((i) => i.severity === "blocking"));
  assert.equal(isSignable(baseOrder()), true);
});

test("duplicate active orders are detected", () => {
  const active = baseOrder({ id: "mo-2" });
  const dups = findDuplicateActiveOrders([active], { medicine: "Paracetamol", patientId: "pt-1", status: "active" });
  assert.equal(dups.length, 1);
});

test("allergy conflict is flagged", () => {
  const o = baseOrder({ medicine: "Penicillin", indication: "Infection" });
  assert.deepEqual(allergyConflict(o, patient), ["penicillin"]);
});

test("missing missed-dose advice falls back to the safe default", () => {
  assert.equal(missedDoseAdviceFor(baseOrder({ missedDoseAdvice: "" })), DEFAULT_MISSED_DOSE_ADVICE);
  assert.equal(missedDoseAdviceFor(baseOrder({ missedDoseAdvice: "Take next at usual time." })), "Take next at usual time.");
});

test("caregiver receive-scope is revocable", () => {
  const grants = [
    { id: "g1", patientId: "pt-1", caregiverId: "cg-1", scope: "receive_reminders" as const, grantedAt: "2026-08-20T00:00:00", revokedAt: undefined },
    { id: "g2", patientId: "pt-1", caregiverId: "cg-2", scope: "receive_reminders" as const, grantedAt: "2026-08-20T00:00:00", revokedAt: "2026-08-25T00:00:00" },
  ];
  assert.equal(caregiverCanReceive(grants, "cg-1", "pt-1"), true);
  assert.equal(caregiverCanReceive(grants, "cg-2", "pt-1"), false); // revoked
});

test("signature is deterministic for the same payload", () => {
  assert.equal(signOrderPayload(baseOrder()), signOrderPayload(baseOrder()));
});

// ── FHIR / ICS ────────────────────────────────────────────────────────────
test("FHIR MedicationRequest mapper emits demo resource shape", () => {
  const r = toFhirMedicationRequest(baseOrder());
  assert.equal(r.resourceType, "MedicationRequest");
  assert.equal(r.medicationCodeableConcept.text, "Paracetamol");
  assert.equal(r.status, "active");
});

test("ICS export hides medicine names in the visible summary", () => {
  const ics = toICS([{ title: "Paracetamol 500mg", start: "2026-08-21T09:00:00Z" }], { genericTitles: true });
  assert.match(ics, /BEGIN:VCALENDAR/);
  // The privacy-sensitive SUMMARY must be generic (no medicine name).
  const summaryLine = ics.split("\r\n").find((l) => l.startsWith("SUMMARY:")) ?? "";
  assert.match(summaryLine, /SUMMARY:Medication reminder/);
  assert.doesNotMatch(summaryLine, /Paracetamol/);
});
