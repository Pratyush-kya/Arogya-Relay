-- Arogya Relay — Care Guidance schema (D1 / SQLite)
-- Applied via `wrangler d1 execute` or drizzle-kit. Synthetic data only.
-- All tables support least-privilege access and are indexed on the queries
-- the application actually runs (by patient, by urgency, by entity).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin','doctor','health_worker','reviewer')),
  display_name TEXT NOT NULL,
  pseudo_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  issued_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('infant','child','adolescent','adult','older_adult')),
  age_years INTEGER,
  village_code TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS consent (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  purpose TEXT NOT NULL,
  granted INTEGER NOT NULL,
  granted_at INTEGER,
  withdrawn_at INTEGER,
  expires_at INTEGER,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS consent_by_patient ON consent(patient_id);

CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  type TEXT NOT NULL CHECK (type IN ('screening','care_guidance','review')),
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  note TEXT
);

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  answers TEXT NOT NULL,
  pregnant INTEGER,
  duration_days INTEGER,
  rapid_deterioration INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  code TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS observations_by_encounter ON observations(encounter_id);

CREATE TABLE IF NOT EXISTS triage_decisions (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  urgency TEXT NOT NULL CHECK (urgency IN ('emergency','same_day','clinician_review','self_care_information','insufficient_information')),
  knowledge_mode TEXT NOT NULL CHECK (knowledge_mode IN ('offline','online','offline_fallback')),
  retrieval_coverage TEXT,
  triggered_rules TEXT NOT NULL,
  emergency_number TEXT NOT NULL,
  medicine_status TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS triage_by_patient ON triage_decisions(patient_id);
CREATE INDEX IF NOT EXISTS triage_by_urgency ON triage_decisions(urgency);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id),
  actor_role TEXT,
  detail TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS audit_by_entity ON audit_events(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS clinician_reviews (
  id TEXT PRIMARY KEY,
  triage_decision_id TEXT NOT NULL REFERENCES triage_decisions(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  state TEXT NOT NULL CHECK (state IN ('pending','approved','rejected','amended')),
  note TEXT,
  reviewed_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS medication_requests (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  signed_by_doctor_id TEXT REFERENCES users(id),
  drug TEXT,
  dose TEXT,
  instruction TEXT,
  signature TEXT,
  signed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS medreq_by_patient ON medication_requests(patient_id);

CREATE TABLE IF NOT EXISTS source_versions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  licence TEXT NOT NULL,
  hash TEXT NOT NULL,
  jurisdiction TEXT,
  review_date TEXT,
  requires_rmp_validation INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT,
  published_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS source_version_unique ON source_versions(source_id, version);

CREATE TABLE IF NOT EXISTS evidence_chunks (
  id TEXT PRIMARY KEY,
  source_version_id TEXT NOT NULL REFERENCES source_versions(id),
  section TEXT NOT NULL,
  anchor TEXT NOT NULL,
  text TEXT NOT NULL,
  keywords TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS retrieval_events (
  id TEXT PRIMARY KEY,
  encounter_id TEXT REFERENCES encounters(id),
  mode TEXT NOT NULL CHECK (mode IN ('offline','online','offline_fallback')),
  chunk_ids TEXT NOT NULL,
  coverage TEXT,
  source_ids TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS safety_rule_versions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  version TEXT NOT NULL,
  label TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('emergency','same_day','clinician_review','self_care_information')),
  requires_rmp_validation INTEGER NOT NULL DEFAULT 1,
  published_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL
);
