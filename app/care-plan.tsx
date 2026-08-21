/**
 * Arogya Relay — Care Plan & Reminder UI (Problem Statement 4).
 *
 * Two views in one tab:
 *  - Doctor editor: author a care plan / medication order, run safety + completeness
 *    checks, sign it (doctor-only). Ambiguous schedules are blocked.
 *  - Patient daily schedule: the signed plan rendered with today's reminders
 *    (upcoming/due/missed/completed), acknowledgement actions, ICS + printable
 *    export, and read-aloud.
 *
 * Uses synthetic demo data only. Doctor role is simulated by a toggle for the
 * prototype; production must enforce RBAC server-side.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

"use client";

import { useMemo, useState } from "react";
import { ReadAloud } from "./read-aloud";
import {
  buildReminders,
  activeTaperStep,
  DEFAULT_MISSED_DOSE_ADVICE,
} from "@/lib/careplan/scheduling.ts";
import {
  assertCanPrescribe,
  AuthorizationError,
  validateOrderCompleteness,
  isSignable,
  findDuplicateActiveOrders,
  allergyConflict,
  missedDoseAdviceFor,
  signOrderPayload,
} from "@/lib/careplan/safety.ts";
import { toICS, PUSH_PRODUCTION_NOTE } from "@/lib/careplan/fhir.ts";
import type {
  CareItem,
  CarePlan,
  Frequency,
  MedicationOrder,
  PatientRef,
  Practitioner,
  Role,
} from "@/lib/careplan/types.ts";
import { useLanguage } from "@/lib/i18n/provider";

// ── Synthetic demo fixtures (no real PHI) ──────────────────────────────────
const DEMO_PATIENT: PatientRef = {
  id: "pt-NR1049",
  reference: "NR-1049",
  ageGroup: "adult",
  pregnant: false,
  allergies: ["penicillin"],
};

const DEMO_DOCTOR: Practitioner = { id: "dr-001", role: "doctor", displayName: "Dr. I. Marak", regNo: "RMP-MEG-1234" };

const DEMO_PLAN: CarePlan = {
  id: "cp-001",
  patientId: DEMO_PATIENT.id,
  practitionerId: DEMO_DOCTOR.id,
  title: "Post-fever recovery plan",
  startDate: "2026-08-20",
  endDate: "2026-08-27",
  languageAccepted: "en",
  packVersion: "1.0.0",
  status: "active",
  createdAt: "2026-08-20T08:00:00",
  updatedAt: "2026-08-20T08:00:00",
  version: 2,
};

function mkOrder(over: Partial<MedicationOrder>): MedicationOrder {
  return {
    id: "mo-001",
    carePlanId: DEMO_PLAN.id,
    patientId: DEMO_PATIENT.id,
    medicine: "Paracetamol",
    strength: "500 mg",
    form: "tablet",
    dose: "1 tablet",
    route: "oral",
    frequency: { kind: "times_per_day", times: 3 },
    foodRelation: "after_food",
    indication: "Fever and pain",
    instructions: "Take after food. Do not exceed 3 per day.",
    startDate: "2026-08-20",
    endDate: "2026-08-27",
    highRisk: false,
    signedByDoctorId: DEMO_DOCTOR.id,
    signedAt: "2026-08-20T08:05:00",
    signature: "sig-demo",
    status: "active",
    createdAt: "2026-08-20T08:00:00",
    updatedAt: "2026-08-20T08:00:00",
    version: 2,
    ...over,
  };
}

const DEMO_ORDERS: MedicationOrder[] = [
  mkOrder({}),
  mkOrder({
    id: "mo-002",
    medicine: "Amoxicillin",
    indication: "Infection",
    instructions: "Complete the full course even if you feel better.",
    frequency: { kind: "times_per_day", times: 2 },
  }),
];

const DEMO_ITEMS: CareItem[] = [
  {
    id: "ci-001",
    carePlanId: DEMO_PLAN.id,
    patientId: DEMO_PATIENT.id,
    type: "appointment",
    title: "Follow-up at CHC Pynursla",
    detail: "Review recovery and repeat vitals.",
    scheduledAt: "2026-08-23T10:00:00",
    prep: ["Fasting not required", "Carry previous prescription"],
    documentsToCarry: ["Care plan summary", "ID card"],
    signedByDoctorId: DEMO_DOCTOR.id,
    status: "active",
    version: 1,
    createdAt: "2026-08-20T08:10:00",
    updatedAt: "2026-08-20T08:10:00",
  },
];

const FREQ_OPTIONS: { value: Frequency["kind"]; label: string }[] = [
  { value: "once", label: "One-time" },
  { value: "times_per_day", label: "Times per day" },
  { value: "every_hours", label: "Every N hours" },
  { value: "weekdays", label: "Specific weekdays" },
  { value: "interval", label: "Every N days" },
  { value: "prn", label: "As needed (PRN)" },
  { value: "ambiguous", label: "Ambiguous (blocked)" },
];

export default function CarePlanView() {
  const { t } = useLanguage();
  const [role, setRole] = useState<Role>("doctor");
  const [now, setNow] = useState("2026-08-21T09:30:00");

  // Editor draft order
  const [draft, setDraft] = useState<MedicationOrder>(() =>
    mkOrder({ id: "mo-new", signedByDoctorId: null, signedAt: null, signature: null, status: "draft" }),
  );
  const [signMsg, setSignMsg] = useState<string | null>(null);

  const issues = useMemo(() => validateOrderCompleteness(draft), [draft]);
  const blocking = issues.filter((i) => i.severity === "blocking");
  const dups = useMemo(() => findDuplicateActiveOrders(DEMO_ORDERS, draft), [draft]);
  const allergy = useMemo(() => allergyConflict(draft, DEMO_PATIENT), [draft]);

  const windowStart = "2026-08-21T00:00:00";
  const windowEnd = "2026-08-21T23:59:59";
  const reminders = useMemo(
    () => buildReminders({ orders: DEMO_ORDERS, items: DEMO_ITEMS, windowStart, windowEnd, now }),
    [now],
  );

  const sign = () => {
    try {
      assertCanPrescribe({ id: DEMO_DOCTOR.id, role });
      if (!isSignable(draft)) {
        setSignMsg("Cannot sign: resolve blocking issues first.");
        return;
      }
      const signed = { ...draft, signedByDoctorId: DEMO_DOCTOR.id, signedAt: now, signature: signOrderPayload(draft), status: "active" as const };
      setDraft(signed);
      setSignMsg("Signed by " + DEMO_DOCTOR.displayName + " (RMP " + DEMO_DOCTOR.regNo + ").");
    } catch (e) {
      setSignMsg(e instanceof AuthorizationError ? e.message : "Signing failed.");
    }
  };

  const ics = useMemo(
    () =>
      toICS(
        reminders.map((r) => ({
          title: r.sourceType === "medication" ? "Medicine reminder" : "Care task",
          start: r.dueAt,
        })),
        { genericTitles: true },
      ),
    [reminders],
  );

  return (
    <div className="page-content section-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("plan.kicker")}</span>
          <h1>{t("plan.title")}</h1>
          <p>{t("plan.subtitle")}</p>
        </div>
        <div className="cg-toggle" role="group" aria-label="View role">
          <button type="button" className={role === "doctor" ? "active" : ""} aria-pressed={role === "doctor"} onClick={() => setRole("doctor")}>{t("plan.doctor")}</button>
          <button type="button" className={role === "patient" ? "active" : ""} aria-pressed={role === "patient"} onClick={() => setRole("patient")}>{t("plan.patient")}</button>
        </div>
      </div>

      <p className="nc-synthetic">{t("plan.demo")}</p>
      <p className="nc-synthetic">{t("plan.reviewedEnglish")}</p>

      {role === "doctor" ? (
        <section className="cg-card cp-editor">
          <header className="cp-editor-head">
            <div>
              <span className="eyebrow">{t("plan.clinicianWorkspace")}</span>
              <h2>{t("plan.editor")}</h2>
              <p>{t("plan.editorHelp")}</p>
            </div>
            <span className="cp-draft-status"><i /> {t("plan.draftOrder")}</span>
          </header>

          <div className="cp-grid">
            <label>{t("plan.medicine")}
              <input value={draft.medicine} onChange={(e) => setDraft({ ...draft, medicine: e.target.value })} />
            </label>
            <label>{t("plan.strength")}
              <input value={draft.strength} onChange={(e) => setDraft({ ...draft, strength: e.target.value })} />
            </label>
            <label>{t("plan.form")}
              <input value={draft.form} onChange={(e) => setDraft({ ...draft, form: e.target.value })} />
            </label>
            <label>{t("plan.dose")}
              <input value={draft.dose} onChange={(e) => setDraft({ ...draft, dose: e.target.value })} />
            </label>
            <label>{t("plan.route")}
              <input value={draft.route} onChange={(e) => setDraft({ ...draft, route: e.target.value })} />
            </label>
            <label>{t("plan.frequency")}
              <select
                value={draft.frequency.kind}
                onChange={(e) => {
                  const kind = e.target.value as Frequency["kind"];
                  const f: Frequency =
                    kind === "times_per_day" ? { kind, times: 2 }
                    : kind === "every_hours" ? { kind, hours: 8 }
                    : kind === "weekdays" ? { kind, days: [1, 3, 5] }
                    : kind === "interval" ? { kind, everyDays: 3 }
                    : kind === "prn" ? { kind }
                    : kind === "once" ? { kind }
                    : { kind };
                  setDraft({ ...draft, frequency: f });
                }}
              >
                {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>{t("plan.food")}
              <select value={draft.foodRelation} onChange={(e) => setDraft({ ...draft, foodRelation: e.target.value as MedicationOrder["foodRelation"] })}>
                <option value="before_food">Before food</option>
                <option value="after_food">After food</option>
                <option value="with_food">With food</option>
                <option value="empty_stomach">Empty stomach</option>
                <option value="any">Any</option>
              </select>
            </label>
            <label>{t("plan.start")}
              <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </label>
            <label>{t("plan.end")}
              <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </label>
          </div>

          <label className="cp-full">{t("plan.indication")}
            <input value={draft.indication} onChange={(e) => setDraft({ ...draft, indication: e.target.value })} />
          </label>
          <label className="cp-full">{t("plan.instructions")}
            <textarea rows={2} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
          </label>
          <label className="cp-check">
            <input type="checkbox" checked={draft.highRisk ?? false} onChange={(e) => setDraft({ ...draft, highRisk: e.target.checked })} /> {t("plan.highRisk")}
          </label>

          {/* Safety surface */}
          {(blocking.length > 0 || dups.length > 0 || allergy.length > 0) && (
            <div className="cp-safety" role="alert">
              <strong>{t("plan.safety")}</strong>
              <ul>
                {blocking.map((i, idx) => <li key={idx} className="cp-block">⛔ {i.message}</li>)}
                {dups.map((d) => <li key={d.id} className="cp-warn">⚠ Duplicate active order: {d.medicine}</li>)}
                {allergy.map((a) => <li key={a} className="cp-warn">⚠ Allergy conflict: {a}</li>)}
              </ul>
            </div>
          )}

          <div className="cp-actions">
            <button type="button" className="primary-button" disabled={blocking.length > 0} onClick={sign}>{t("plan.sign")}</button>
            {signMsg && <span className="cp-msg" role="status">{signMsg}</span>}
          </div>
          <p className="cp-note">{draft.status === "active" && draft.signedAt ? `Order signed ${draft.signedAt} · signature ${draft.signature}` : t("plan.unsigned")}</p>
        </section>
      ) : (
        <section className="cg-card">
          <h2>{t("plan.schedule")} — {DEMO_PATIENT.reference}</h2>
          <div className="cp-now">
            <label>{t("plan.demoClock")}
              <input type="datetime-local" value={now} onChange={(e) => setNow(e.target.value.replace("T", "T") + ":00")} />
            </label>
            <ReadAloud text={"You have " + reminders.length + " reminders today."} />
          </div>

          <ul className="cp-list">
            {reminders.length === 0 && <li className="nc-empty">{t("plan.noReminders")}</li>}
            {reminders.map((r) => {
              const order = DEMO_ORDERS.find((o) => o.id === r.sourceId);
              const item = DEMO_ITEMS.find((i) => i.id === r.sourceId);
              const taper = order ? activeTaperStep(order, r.dueAt.slice(0, 10)) : null;
              const advice = order ? missedDoseAdviceFor(order) : DEFAULT_MISSED_DOSE_ADVICE;
              return (
                <li key={r.id} className={`cp-item cp-${r.state}`}>
                  <div className="cp-item-head">
                    <strong>{order ? `${order.medicine} ${order.strength}` : item?.title}</strong>
                    <span className={`cp-badge ${r.state}`}>{r.state}</span>
                  </div>
                  <div className="cp-item-meta">
                    {r.dueAt.slice(11, 16)}
                    {order && ` · ${taper ? taper.dose : order.dose} · ${order.route} · ${order.foodRelation.replace("_", " ")}`}
                    {order && ` · ${order.instructions}`}
                  </div>
                  {order && (
                    <p className="cp-advice">Missed a dose? {advice}</p>
                  )}
                  <div className="cp-item-actions">
                    <button type="button" className="secondary-button">{t("plan.taken")}</button>
                    <button type="button" className="nc-link">{t("plan.snooze")}</button>
                    <button type="button" className="nc-link">{t("plan.skip")}</button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="cp-export">
            <button type="button" className="secondary-button" onClick={() => navigator.clipboard?.writeText(ics)}>{t("plan.copyIcs")}</button>
            <button type="button" className="secondary-button" onClick={() => window.print()}>{t("plan.print")}</button>
          </div>
          <p className="cp-note">{PUSH_PRODUCTION_NOTE}</p>
        </section>
      )}
    </div>
  );
}
