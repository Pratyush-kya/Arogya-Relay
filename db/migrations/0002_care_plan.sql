-- Arogya Relay — Care Plan & Reminders schema (D1 / SQLite)
-- Problem Statement 4. Applied via `wrangler d1 execute` or drizzle-kit.
-- Synthetic data only. Doctor-only authoring enforced at the service layer.

CREATE TABLE IF NOT EXISTS care_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  practitioner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  language_accepted TEXT NOT NULL,
  pack_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','discontinued')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS careplan_by_patient ON care_plans(patient_id);

CREATE TABLE IF NOT EXISTS medication_orders (
  id TEXT PRIMARY KEY,
  care_plan_id TEXT NOT NULL REFERENCES care_plans(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  medicine TEXT NOT NULL,
  strength TEXT NOT NULL,
  form TEXT NOT NULL,
  dose TEXT NOT NULL,
  route TEXT NOT NULL,
  frequency TEXT NOT NULL,            -- JSON (Frequency)
  food_relation TEXT NOT NULL,
  indication TEXT NOT NULL,
  instructions TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  tapers TEXT,                        -- JSON (TaperStep[])
  high_risk INTEGER NOT NULL DEFAULT 0,
  missed_dose_advice TEXT,
  signed_by_doctor_id TEXT REFERENCES users(id),
  signed_at INTEGER,
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','discontinued')),
  discontinued_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS medorder_by_patient ON medication_orders(patient_id);
CREATE INDEX IF NOT EXISTS medorder_by_plan ON medication_orders(care_plan_id);
CREATE INDEX IF NOT EXISTS medorder_by_status ON medication_orders(status);

CREATE TABLE IF NOT EXISTS care_items (
  id TEXT PRIMARY KEY,
  care_plan_id TEXT NOT NULL REFERENCES care_plans(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  type TEXT NOT NULL CHECK (type IN ('appointment','test','refill','activity','symptom_checkin','post_visit_task')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  prep TEXT,                          -- JSON (string[])
  documents_to_carry TEXT,            -- JSON (string[])
  signed_by_doctor_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS careitem_by_patient ON care_items(patient_id);
CREATE INDEX IF NOT EXISTS careitem_by_plan ON care_items(care_plan_id);

CREATE TABLE IF NOT EXISTS reminder_instances (
  id TEXT PRIMARY KEY,                -- deterministic idempotency key
  source_type TEXT NOT NULL CHECK (source_type IN ('medication','care_item')),
  source_id TEXT NOT NULL,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  due_at INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('upcoming','due','missed','completed','skipped','snoozed')),
  acknowledged_as TEXT,
  acknowledged_at INTEGER,
  channels TEXT NOT NULL             -- JSON (ReminderChannel[])
);
CREATE INDEX IF NOT EXISTS reminder_by_patient_due ON reminder_instances(patient_id, due_at);

CREATE TABLE IF NOT EXISTS caregiver_grants (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  caregiver_id TEXT NOT NULL REFERENCES users(id),
  scope TEXT NOT NULL CHECK (scope IN ('view_reminders','receive_reminders')),
  granted_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS cg_by_patient ON caregiver_grants(patient_id, caregiver_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  subscription TEXT NOT NULL,         -- JSON
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS push_by_patient ON push_subscriptions(patient_id);

CREATE TABLE IF NOT EXISTS pending_sync (
  id TEXT PRIMARY KEY,                -- idempotency key
  kind TEXT NOT NULL CHECK (kind IN ('ack','edit','discontinue','grant','revoke')),
  payload TEXT NOT NULL,              -- JSON
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS pendingsync_by_kind ON pending_sync(kind);
