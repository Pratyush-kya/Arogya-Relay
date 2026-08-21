/**
 * Arogya Relay — Care Plan scheduling engine (Problem Statement 4).
 *
 * Pure, deterministic, timezone-explicit. All "now" values are passed in (fake
 * clock in tests) so scheduling is reproducible. The engine NEVER infers a
 * schedule from free text; ambiguous frequencies are rejected by the caller via
 * `validateOrderCompleteness`.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type {
  CareItem,
  MedicationOrder,
  ReminderInstance,
  Weekday,
} from "./types.ts";

/** Stable idempotency key for a reminder instance (orderId + slot). */
export function reminderId(sourceType: "medication" | "care_item", sourceId: string, dueAt: string): string {
  return `${sourceType}:${sourceId}:${dueAt}`;
}

/** Deterministic daily slot times for "times per day" within the day (UTC hours). */
function dailySlots(times: number, base = 9): number[] {
  if (times <= 0) return [];
  if (times === 1) return [base]; // 09:00
  const out: number[] = [];
  const start = 9;
  const end = 21;
  for (let i = 0; i < times; i++) {
    out.push(Math.round(start + (i * (end - start)) / (times - 1)));
  }
  return out;
}

function atHour(isoDate: string, hour: number): string {
  // isoDate is YYYY-MM-DD; produce a valid UTC datetime YYYY-MM-DDTHH:MM:00Z.
  return `${isoDate}T${String(hour).padStart(2, "0")}:00:00Z`;
}

function datePart(iso: string): string {
  return iso.slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Day-of-week (0=Sun..6=Sat) for a YYYY-MM-DD date, computed in UTC. */
function dow(isoDate: string): Weekday {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay() as Weekday;
}

/**
 * Compute due-times for a medication order between [windowStart, windowEnd].
 * Returns ISO datetimes. PRN returns [] (no ordinary scheduled reminders).
 * Ambiguous returns [] (blocked upstream). Paused is handled by the caller
 * filtering on order.status, but we also skip if status !== active.
 */
export function medicationDueTimes(
  order: MedicationOrder,
  windowStart: string,
  windowEnd: string,
): string[] {
  if (order.status !== "active") return [];
  if (order.frequency.kind === "prn" || order.frequency.kind === "ambiguous") return [];

  // Loop over date-only YYYY-MM-DD strings; slot times are appended via atHour.
  const winStartDay = windowStart.slice(0, 10);
  const winEndDay = windowEnd.slice(0, 10);
  const start = order.startDate > winStartDay ? order.startDate : winStartDay;
  const end = order.endDate < winEndDay ? order.endDate : winEndDay;
  if (start > end) return [];

  const out: string[] = [];
  let cursor = start;
  // Cap iterations to avoid pathological loops (e.g. every_hours=1 over months).
  let guard = 0;
  const MAX = 5000;

  const pushDaySlots = (dayIso: string) => {
    const freq = order.frequency;
    if (freq.kind === "once") {
      // one-time: a single slot at 09:00 on startDate only
      if (dayIso === order.startDate) out.push(atHour(dayIso, 9));
      return;
    }
    if (freq.kind === "times_per_day") {
      for (const h of dailySlots(freq.times)) out.push(atHour(dayIso, h));
    } else if (freq.kind === "every_hours") {
      for (let h = 0; h < 24; h += freq.hours) out.push(atHour(dayIso, h));
    } else if (freq.kind === "weekdays") {
      const d = dow(dayIso);
      if (freq.days.includes(d)) out.push(atHour(dayIso, 9));
    } else if (freq.kind === "interval") {
      // dose every `everyDays` from startDate
      const offset = Math.round(
        (Date.parse(`${dayIso}T00:00:00Z`) - Date.parse(`${order.startDate}T00:00:00Z`)) / 86400000,
      );
      if (offset >= 0 && offset % freq.everyDays === 0) out.push(atHour(dayIso, 9));
    }
  };

  while (cursor <= end && guard++ < MAX) {
    pushDaySlots(cursor);
    cursor = addDays(cursor, 1);
  }

  // Taper override: only emit slots on days covered by a taper step, and use
  // the step's times-per-day for that day's slot count.
  if (order.tapers && order.tapers.length) {
    const tapered: string[] = [];
    for (const dayIso of Array.from(new Set(out.map(datePart)))) {
      const step = order.tapers.find((s) => dayIso >= s.fromDate && dayIso <= s.toDate);
      if (!step) continue;
      for (const h of dailySlots(step.timesPerDay)) tapered.push(atHour(dayIso, h));
    }
    return tapered.sort();
  }

  return out.sort();
}

/** Which taper step (if any) is active on a given ISO date. */
export function activeTaperStep(order: MedicationOrder, isoDate: string): { dose: string; timesPerDay: number } | null {
  if (!order.tapers) return null;
  const step = order.tapers.find((s) => isoDate >= s.fromDate && isoDate <= s.toDate);
  return step ? { dose: step.dose, timesPerDay: step.timesPerDay } : null;
}

/** Due times for care items (appointments/tests/etc.) — single fixed time. */
export function careItemDueTimes(item: CareItem, windowStart: string, windowEnd: string): string[] {
  if (item.status !== "active") return [];
  if (item.scheduledAt >= windowStart && item.scheduledAt <= windowEnd) return [item.scheduledAt];
  return [];
}

export interface BuildWindowInput {
  orders: MedicationOrder[];
  items: CareItem[];
  windowStart: string;
  windowEnd: string;
  now: string;
  /** Paused hospitalization window (inclusive) during which reminders skip. */
  pausedFrom?: string;
  pausedTo?: string;
}

/**
 * Build reminder instances for a window, classifying each as upcoming/due/missed
 * relative to `now`. PRN and ambiguous produce nothing. Paused windows yield no
 * instances. Idempotent keys let the store dedupe across syncs.
 */
export function buildReminders(input: BuildWindowInput): ReminderInstance[] {
  const { orders, items, windowStart, windowEnd, now } = input;
  const inPause = (iso: string) =>
    input.pausedFrom && input.pausedTo ? iso >= input.pausedFrom && iso <= input.pausedTo : false;

  const out: ReminderInstance[] = [];

  for (const order of orders) {
    for (const due of medicationDueTimes(order, windowStart, windowEnd)) {
      if (inPause(due)) continue;
      out.push(makeInstance("medication", order.id, order.patientId, due, now));
    }
  }
  for (const item of items) {
    for (const due of careItemDueTimes(item, windowStart, windowEnd)) {
      if (inPause(due)) continue;
      out.push(makeInstance("care_item", item.id, item.patientId, due, now));
    }
  }
  return out;
}

function makeInstance(
  sourceType: "medication" | "care_item",
  sourceId: string,
  patientId: string,
  dueAt: string,
  now: string,
): ReminderInstance {
  const dueMs = Date.parse(dueAt);
  const nowMs = Date.parse(now);
  const state: ReminderInstance["state"] =
    dueMs > nowMs ? "upcoming" : nowMs - dueMs > 2 * 3600 * 1000 ? "missed" : "due";
  return {
    id: reminderId(sourceType, sourceId, dueAt),
    sourceType,
    sourceId,
    patientId,
    dueAt,
    state,
    channels: ["in_app"],
  };
}

/**
 * Conflict resolution: the current SIGNED server order wins over a stale local
 * schedule. Returns the higher-version record and flags staleness.
 */
export function resolveConflict<T extends { version: number; id: string }>(
  local: T,
  server: T,
): { winner: T; stale: boolean } {
  if (server.version > local.version) return { winner: server, stale: true };
  if (local.version > server.version) return { winner: local, stale: false };
  return { winner: server, stale: false };
}

/** Default missed-dose advice when an order lacks clinician-authored advice. */
export const DEFAULT_MISSED_DOSE_ADVICE =
  "Do not double the next dose. Contact your doctor or pharmacist for instructions.";
