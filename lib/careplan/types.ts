/**
 * Arogya Relay — Care Plan & Reminder domain types (Problem Statement 4).
 *
 * FHIR R4-aligned (ABDM-compatible) concepts: MedicationRequest, Medication,
 * CarePlan, Appointment, ServiceRequest, Task, Observation, Patient,
 * Practitioner. These are DEMO TYPES for a frontend prototype; they mirror the
 * shape of FHIR resources but are NOT a conformant FHIR server.
 *
 * SAFETY BOUNDARY (from the brief, non-negotiable):
 *  - Only an authorised doctor may create/approve/change/pause/discontinue a
 *    MedicationRequest. The assistant/Chatbot MAY explain a signed instruction
 *    but NEVER create or modify one.
 *  - The system does not prescribe, change doses, or present a reminder as proof
 *    that medicine was taken.
 *  - PRN/as-needed medicines get NO ordinary scheduled-dose reminders unless the
 *    prescriber explicitly defines safe conditions and limits.
 *  - Ambiguous schedules are BLOCKED and returned to the clinician; the system
 *    never infers a schedule from unclear free text.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type { LanguageCode, SafetyTier } from "../i18n/types";

/** Roles permitted in the care-plan workflow. Mirrors `users.role`. */
export type Role = "admin" | "doctor" | "health_worker" | "reviewer" | "patient" | "caregiver";

/** A doctor-signed order is the only authoritative source of a reminder. */
export interface Practitioner {
  id: string;
  role: "doctor" | "admin";
  displayName: string;
  /** Synthetic registration reference only. */
  regNo: string;
}

/** Minimal patient reference (no names/precise location). */
export interface PatientRef {
  id: string;
  reference: string; // e.g. "NR-1049"
  ageGroup: "infant" | "child" | "adolescent" | "adult" | "older_adult";
  pregnant?: boolean;
  allergies: string[]; // active allergy statements (free list, clinician-entered)
}

/** Food relationship for a dose (Tier 1 — preserved exactly). */
export type FoodRelation = "before_food" | "after_food" | "with_food" | "empty_stomach" | "any";

/**
 * Frequency model. `ambiguous` is a deliberate reject state — the clinician must
 * re-author an explicit schedule; the engine never infers one.
 */
export type Frequency =
  | { kind: "once" } // one-time dose
  | { kind: "times_per_day"; times: number } // e.g. 2x/day
  | { kind: "every_hours"; hours: number }
  | { kind: "weekdays"; days: Weekday[] } // specific weekdays
  | { kind: "interval"; everyDays: number } // e.g. every 3 days
  | { kind: "prn"; maxPerDay?: number; condition?: string } // as-needed, no ordinary reminders
  | { kind: "ambiguous" }; // REJECT — never scheduled

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun..Sat

/** An authored dose within a taper step (descending doses over time). */
export interface TaperStep {
  fromDate: string; // ISO date
  toDate: string; // ISO date
  dose: string; // e.g. "2 tablets"
  timesPerDay: number;
}

export type ReminderChannel = "in_app" | "pwa" | "web_push" | "calendar_ics" | "print";

/** A single medication order — one line of a CarePlan. FHIR MedicationRequest. */
export interface MedicationOrder {
  id: string;
  carePlanId: string;
  patientId: string;
  /** Exact prescribed medicine name/str. NEVER translated or altered. */
  medicine: string;
  strength: string; // e.g. "500 mg" — preserved exactly
  form: string; // e.g. "tablet"
  dose: string; // e.g. "1 tablet"
  route: string; // e.g. "oral"
  frequency: Frequency;
  foodRelation: FoodRelation;
  indication: string; // clinician-authored
  instructions: string; // clinician-authored (Tier 1 if safety-critical)
  startDate: string; // ISO date
  endDate: string; // ISO date
  tapers?: TaperStep[];
  highRisk?: boolean; // clinician-controlled high-risk flag
  /** Approved missed-dose advice stored per order; if absent use default. */
  missedDoseAdvice?: string;
  // Signing (authoritative workflow)
  signedByDoctorId: string | null;
  signedAt: string | null; // ISO
  signature: string | null; // prototype: hash of order payload
  status: "draft" | "active" | "paused" | "discontinued";
  discontinuedReason?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  /** Bumping this invalidates stale cached reminders (conflict resolution). */
  version: number;
}

/** Non-medication care items: appointments, tests, activities, check-ins. */
export type CareItemType =
  | "appointment"
  | "test"
  | "refill"
  | "activity"
  | "symptom_checkin"
  | "post_visit_task";

export interface CareItem {
  id: string;
  carePlanId: string;
  patientId: string;
  type: CareItemType;
  title: string;
  detail: string;
  scheduledAt: string; // ISO datetime
  /** Preparation checklist (appointment prep, fasting, documents to carry). */
  prep?: string[];
  documentsToCarry?: string[];
  signedByDoctorId: string | null;
  status: "active" | "completed" | "cancelled";
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** A full clinician-authored care plan (FHIR CarePlan). */
export interface CarePlan {
  id: string;
  patientId: string;
  practitionerId: string;
  title: string;
  startDate: string;
  endDate: string;
  languageAccepted: LanguageCode; // language + version the patient accepted
  packVersion: string;
  status: "draft" | "active" | "paused" | "discontinued";
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** A generated reminder instance (computed by the scheduler, never authored). */
export type ReminderState = "upcoming" | "due" | "missed" | "completed" | "skipped" | "snoozed";

export interface ReminderInstance {
  id: string; // deterministic from (orderId, slotIso) for idempotency
  sourceType: "medication" | "care_item";
  sourceId: string;
  patientId: string;
  /** Scheduled time, ISO. Stored; never parsed from free text at fire time. */
  dueAt: string;
  state: ReminderState;
  /** Self-reported acknowledgement — NEVER verified ingestion. */
  acknowledgedAs?: "taken" | "snoozed" | "skipped" | "no_medicine" | "side_effect" | "unsure";
  acknowledgedAt?: string;
  channels: ReminderChannel[];
}

/** Acknowledgement actions the patient/worker can record. */
export type AckAction = "taken" | "snoozed" | "skipped" | "no_medicine" | "side_effect" | "unsure";

/** Consent-gated caregiver access (revocable, audited). */
export interface CaregiverGrant {
  id: string;
  patientId: string;
  caregiverId: string;
  scope: "view_reminders" | "receive_reminders";
  grantedAt: string;
  revokedAt?: string;
}

/** A server/worker audit event for any clinical schedule change. */
export interface CarePlanAudit {
  id: string;
  entityType: "care_plan" | "medication_order" | "care_item" | "caregiver_grant";
  entityId: string;
  action: string; // created|signed|paused|discontinued|edited|acked|granted|revoked
  actorId: string;
  actorRole: Role;
  detail?: Record<string, unknown>;
  createdAt: string;
}

/** A pending offline action queued for sync (idempotent). */
export interface PendingSync {
  id: string; // idempotency key
  kind: "ack" | "edit" | "discontinue" | "grant" | "revoke";
  payload: Record<string, unknown>;
  createdAt: string;
}

export const SAFETY_TIER: SafetyTier = "tier1";
