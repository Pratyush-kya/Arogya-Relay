-- Arogya Relay — Nearby Care schema (D1 / SQLite) — part 2
-- Synthetic data only. Applied after 0001_care_guidance.sql.

CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hospital','phc','chc','aam','clinic','pharmacy','government_service')),
  lat TEXT NOT NULL,
  lng TEXT NOT NULL,
  accuracy_meters INTEGER,
  address TEXT NOT NULL,
  village_code TEXT,
  phone TEXT,
  emergency INTEGER NOT NULL DEFAULT 0,
  icu INTEGER NOT NULL DEFAULT 0,
  oxygen INTEGER NOT NULL DEFAULT 0,
  paediatrics INTEGER NOT NULL DEFAULT 0,
  maternity INTEGER NOT NULL DEFAULT 0,
  surgery INTEGER NOT NULL DEFAULT 0,
  ambulance INTEGER NOT NULL DEFAULT 0,
  pharmacy INTEGER NOT NULL DEFAULT 0,
  mental_health INTEGER NOT NULL DEFAULT 0,
  diagnostics INTEGER NOT NULL DEFAULT 0,
  schemes TEXT NOT NULL,
  open_now INTEGER,
  verification TEXT NOT NULL CHECK (verification IN ('verified','unverified','stale','disputed')),
  verification_source TEXT,
  verified_at TEXT,
  expires_at TEXT,
  external_id TEXT,
  source_url TEXT,
  last_fetched_at TEXT
);
CREATE INDEX IF NOT EXISTS facilities_by_type ON facilities(type);
CREATE INDEX IF NOT EXISTS facilities_by_verification ON facilities(verification);
CREATE INDEX IF NOT EXISTS facilities_by_box ON facilities(lat, lng);

CREATE TABLE IF NOT EXISTS source_records (
  id TEXT PRIMARY KEY,
  facility_id TEXT REFERENCES facilities(id),
  organisation TEXT NOT NULL,
  url TEXT NOT NULL,
  external_id TEXT,
  fetched_at TEXT NOT NULL,
  verified_at TEXT,
  expires_at TEXT,
  field_provenance TEXT
);
CREATE INDEX IF NOT EXISTS source_by_facility ON source_records(facility_id);

CREATE TABLE IF NOT EXISTS verification_history (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified','unverified','stale','disputed','cancelled')),
  actor_id TEXT,
  note TEXT,
  changed_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS verification_by_entity ON verification_history(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS camps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  organiser TEXT NOT NULL,
  source TEXT NOT NULL,
  services TEXT NOT NULL,
  eligibility TEXT,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  recurrence TEXT,
  venue TEXT NOT NULL,
  lat TEXT NOT NULL,
  lng TEXT NOT NULL,
  contact TEXT,
  verification TEXT NOT NULL CHECK (verification IN ('verified','unverified','stale','disputed')),
  last_verified_at TEXT,
  cancelled INTEGER NOT NULL DEFAULT 0,
  validity_end TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS camps_by_validity ON camps(validity_end, cancelled);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  origin_lat TEXT NOT NULL,
  origin_lng TEXT NOT NULL,
  origin_accuracy INTEGER,
  required_capabilities TEXT NOT NULL,
  emergency INTEGER NOT NULL DEFAULT 0,
  chosen_facility_id TEXT REFERENCES facilities(id),
  straight_line_km TEXT,
  road_eta_min TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS referrals_by_patient ON referrals(patient_id);

CREATE TABLE IF NOT EXISTS location_snapshots (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  lat TEXT NOT NULL,
  lng TEXT NOT NULL,
  accuracy_meters INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('gps','manual','approximate')),
  purpose TEXT NOT NULL,
  consent_given_at TEXT NOT NULL,
  retention_until TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS location_by_retention ON location_snapshots(retention_until);

CREATE TABLE IF NOT EXISTS routing_results (
  id TEXT PRIMARY KEY,
  referral_id TEXT REFERENCES referrals(id),
  facility_id TEXT REFERENCES facilities(id),
  road_distance_km TEXT,
  road_eta_min TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('online','offline_estimate')),
  provider TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
