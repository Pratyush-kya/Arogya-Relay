/**
 * Arogya Relay — Care Plan safety & authorization (Problem Statement 4).
 *
 * Enforces the authoritative clinician workflow and medication-safety controls
 * from the brief. These functions are pure and unit-tested; the UI/API layer
 * calls them before mutating state.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type {
  CaregiverGrant,
  MedicationOrder,
  PatientRef,
  Role,
} from "./types.ts";
import { DEFAULT_MISSED_DOSE_ADVICE } from "./scheduling.ts";

/** Roles allowed to create/approve/modify/discontinue a MedicationRequest. */
const PRESCRIBER_ROLES: Role[] = ["doctor", "admin"];

export function canPrescribe(actor: { role: Role }): boolean {
  return PRESCRIBER_ROLES.includes(actor.role);
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Throw unless the actor may author/modify a prescription instruction. */
export function assertCanPrescribe(actor: { id: string; role: Role }): void {
  if (!canPrescribe(actor)) {
    throw new AuthorizationError(
      "Only an authorised doctor may create, approve, change, pause or discontinue a prescription instruction.",
    );
  }
}

/** The chatbot/assistant is NEVER allowed to mutate a MedicationRequest. */
export function assertNotAssistant(actor: { role: Role }): void {
  if (actor.role === "patient" || actor.role === "caregiver" || actor.role === "health_worker") {
    throw new AuthorizationError("The assistant cannot create or modify a MedicationRequest.");
  }
}

// ---------------------------------------------------------------------------
// Completeness & ambiguity (block unclear schedules, return to clinician)
// ---------------------------------------------------------------------------

export interface CompletenessIssue {
  field: string;
  severity: "blocking" | "warning";
  message: string;
}

/**
 * Validate an order is complete and unambiguous before it can be signed.
 * Ambiguous frequency is a hard BLOCK. Missing dose/route/indication are blocks.
 */
export function validateOrderCompleteness(order: MedicationOrder): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  if (order.frequency.kind === "ambiguous") {
    issues.push({ field: "frequency", severity: "blocking", message: "Schedule is ambiguous. Re-author an explicit frequency." });
  }
  if (order.frequency.kind === "prn" && !order.frequency.condition && !order.frequency.maxPerDay) {
    issues.push({
      field: "frequency",
      severity: "blocking",
      message: "PRN medicine needs explicit safe conditions and/or a daily maximum before reminders can be considered.",
    });
  }
  if (!order.medicine?.trim()) issues.push({ field: "medicine", severity: "blocking", message: "Medicine name is required." });
  if (!order.dose?.trim()) issues.push({ field: "dose", severity: "blocking", message: "Dose is required." });
  if (!order.route?.trim()) issues.push({ field: "route", severity: "blocking", message: "Route is required." });
  if (!order.indication?.trim()) issues.push({ field: "indication", severity: "blocking", message: "Indication is required." });
  if (!order.instructions?.trim()) issues.push({ field: "instructions", severity: "warning", message: "Patient instructions are empty." });
  if (!order.startDate || !order.endDate) issues.push({ field: "dates", severity: "blocking", message: "Start and end dates are required." });
  if (order.startDate > order.endDate) issues.push({ field: "dates", severity: "blocking", message: "End date is before start date." });
  return issues;
}

export function isSignable(order: MedicationOrder): boolean {
  return validateOrderCompleteness(order).every((i) => i.severity !== "blocking");
}

// ---------------------------------------------------------------------------
// Medication safety checks
// ---------------------------------------------------------------------------

/** Duplicate active-order warning for the same medicine in an active state. */
export function findDuplicateActiveOrders(
  orders: MedicationOrder[],
  candidate: Pick<MedicationOrder, "medicine" | "patientId" | "status">,
): MedicationOrder[] {
  const med = candidate.medicine.trim().toLowerCase();
  return orders.filter(
    (o) => o.medicine.trim().toLowerCase() === med && o.patientId === candidate.patientId && o.status === "active",
  );
}

/** Allergy confirmation: does the order's medicine collide with a stated allergy? */
export function allergyConflict(order: MedicationOrder, patient: PatientRef): string[] {
  const med = order.medicine.trim().toLowerCase();
  return patient.allergies.filter((a) => a.trim().toLowerCase() === med);
}

/**
 * High-risk escalation gate. Returns true when a high-risk order is involved and
 * the caller should require explicit clinician confirmation / monitoring plan.
 */
export function requiresHighRiskConfirmation(order: MedicationOrder): boolean {
  return Boolean(order.highRisk);
}

/** Missed-dose advice: per-order if present, else the safe default. */
export function missedDoseAdviceFor(order: MedicationOrder): string {
  return order.missedDoseAdvice && order.missedDoseAdvice.trim().length > 0
    ? order.missedDoseAdvice
    : DEFAULT_MISSED_DOSE_ADVICE;
}

// ---------------------------------------------------------------------------
// Caregiver consent / authorization
// ---------------------------------------------------------------------------

export function caregiverCanReceive(grants: CaregiverGrant[], caregiverId: string, patientId: string): boolean {
  return grants.some(
    (g) => g.caregiverId === caregiverId && g.patientId === patientId && !g.revokedAt && g.scope === "receive_reminders",
  );
}

export function caregiverCanView(grants: CaregiverGrant[], caregiverId: string, patientId: string): boolean {
  return grants.some(
    (g) => g.caregiverId === caregiverId && g.patientId === patientId && !g.revokedAt && g.scope === "view_reminders",
  );
}

/**
 * PHI/ID safety: never expose patient/medicine ids in URLs. Validate a candidate
 * path segment is opaque and non-sensitive.
 */
export function isSafeUrlSegment(segment: string): boolean {
  // Disallow anything that looks like a PHI-bearing query or raw id in a path.
  return !/\?|patient|medicine|med_|order|dose/i.test(segment);
}

// ---------------------------------------------------------------------------
// Signing (authoritative workflow)
// ---------------------------------------------------------------------------

/** A prototype signature: a stable hash of the order's clinical payload. */
export function signOrderPayload(order: MedicationOrder): string {
  const raw = [
    order.patientId,
    order.medicine,
    order.strength,
    order.dose,
    order.route,
    order.frequency.kind,
    order.foodRelation,
    order.indication,
    order.instructions,
    order.startDate,
    order.endDate,
    order.version,
  ].join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return `sig-${h.toString(16)}`;
}
