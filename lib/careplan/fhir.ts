/**
 * Arogya Relay — FHIR R4 mapping & export adapters (Problem Statement 4).
 *
 * Maps internal care-plan records to ABDM-compatible FHIR R4 resource shapes
 * (MedicationRequest, CarePlan, Appointment, ServiceRequest, Task, Patient,
 * Practitioner). These are structural mappings for interoperability; this
 * prototype is NOT a FHIR server and emits demo JSON only.
 *
 * Also provides ICS calendar export (generic, non-sensitive titles by default)
 * and documents the Web Push / PWA adapter architecture. No network calls.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type { CareItem, CarePlan, MedicationOrder } from "./types.ts";

// ---------------------------------------------------------------------------
// FHIR R4 resource mappers (subset, demo-shaped)
// ---------------------------------------------------------------------------

export function toFhirMedicationRequest(o: MedicationOrder) {
  return {
    resourceType: "MedicationRequest",
    id: o.id,
    status: o.status === "active" ? "active" : o.status === "discontinued" ? "stopped" : o.status,
    intent: "order",
    medicationCodeableConcept: { text: o.medicine },
    subject: { reference: `Patient/${o.patientId}` },
    requester: o.signedByDoctorId ? { reference: `Practitioner/${o.signedByDoctorId}` } : undefined,
    authoredOn: o.signedAt ?? o.createdAt,
    dosageInstruction: [
      {
        text: `${o.dose} ${o.route} — ${o.instructions}`,
        timing: { code: { text: o.frequency.kind } },
        additionalInstruction: [{ text: o.foodRelation.replace("_", " ") }],
      },
    ],
    // Authoritative signing evidence (prototype hash).
    extension: o.signature ? [{ url: "https://arogya.relay/fhir/Extension#signature", valueString: o.signature }] : undefined,
  };
}

export function toFhirCarePlan(plan: CarePlan) {
  return {
    resourceType: "CarePlan",
    id: plan.id,
    status: plan.status,
    intent: "plan",
    subject: { reference: `Patient/${plan.patientId}` },
    author: { reference: `Practitioner/${plan.practitionerId}` },
    period: { start: plan.startDate, end: plan.endDate },
    // Language + pack version the patient accepted (multilingual provenance).
    language: plan.languageAccepted,
    meta: { tag: [{ system: "https://arogya.relay/pack", code: plan.packVersion }] },
  };
}

export function toFhirAppointment(item: CareItem) {
  return {
    resourceType: "Appointment",
    id: item.id,
    status: item.status === "active" ? "booked" : item.status,
    description: item.title,
    start: item.scheduledAt,
    comment: item.detail,
  };
}

// ---------------------------------------------------------------------------
// ICS calendar export (generic, privacy-safe by default)
// ---------------------------------------------------------------------------

/** Escape ICS text per RFC 5545. */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(iso: string): string {
  // YYYY-MM-DDTHH:MM:SS -> YYYYMMDDTHHMMSSZ (treat naive as UTC for export)
  return iso.replace(/[-:]/g, "").replace(/\.\d+Z?$/, "").padEnd(15, "0").replace(/Z?$/, "Z");
}

/**
 * Export a reminder window as ICS. `genericTitles` hides medicine names on the
 * lock screen / calendar by default (privacy-safe). Use only approved,
 * non-sensitive titles unless the patient has consented to reveal.
 */
export function toICS(
  events: { title: string; start: string; detail?: string }[],
  opts: { genericTitles?: boolean; productId?: string } = {},
): string {
  const pid = opts.productId ?? "arogya-relay";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${pid}//Care Plan//EN`,
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    const title = opts.genericTitles ? "Medication reminder" : e.title;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${esc(e.title)}-${esc(e.start)}`,
      `DTSTAMP:${toIcsDate(e.start)}`,
      `DTSTART:${toIcsDate(e.start)}`,
      `SUMMARY:${esc(title)}`,
      e.detail ? `DESCRIPTION:${esc(e.detail)}` : "",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

// ---------------------------------------------------------------------------
// Web Push / PWA adapter architecture (documented; not a live integration)
// ---------------------------------------------------------------------------

/**
 * Web Push adapter contract. In production this would use standards-based Web
 * Push with VAPID credentials stored as hosted secrets (never committed files).
 * This prototype documents the contract and the UNVERIFIED production
 * dependency: scheduled worker execution must be verified on the hosting
 * platform before claiming reliable server push.
 */
export interface PushAdapter {
  /** Subscribe a device (push subscription JSON). Returns subscription id. */
  subscribe(patientId: string, subscription: unknown): Promise<string>;
  /** Schedule a notification for `dueAt`. Returns a job reference. */
  schedule(notification: { patientId: string; dueAt: string; generic: boolean }): Promise<string>;
  /** Delete expired/invalid subscriptions. */
  pruneExpired(): Promise<number>;
}

/**
 * Production-readiness note (mirrors the brief): a web-only PWA cannot guarantee
 * an exact alarm after the OS/browser terminates background activity. A future
 * Capacitor/native Android layer using OS-local notifications is the dependable
 * offline path. Until then, in-app + PWA best-effort notifications are provided
 * and MUST NOT be described as a guaranteed medical alarm.
 */
export const PUSH_PRODUCTION_NOTE =
  "Web Push scheduling depends on verified scheduled-worker execution in the hosting platform. Not verified in this prototype; treat as best-effort. A native layer is required for guaranteed offline alarms.";
