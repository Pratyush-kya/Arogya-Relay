/**
 * Shared types for the Care Guidance clinical decision-support assistant.
 *
 * IMPORTANT (prototype boundary): this module encodes *screening support*,
 * never diagnosis. Every rule and source is flagged `requiresRmpValidation`
 * because thresholds and wording must be approved by a Registered Medical
 * Practitioner before any real-patient use. No real patient data is used.
 */

/** Triage outcome returned by the deterministic engine. */
export type Urgency =
  | "emergency" // emergency now
  | "same_day" // same-day clinician
  | "clinician_review" // scheduled clinical review
  | "self_care_information" // clinician-approved home-care information
  | "insufficient_information"; // not enough to act safely

/** Where the evidence behind a response came from. */
export type KnowledgeMode =
  | "offline" // only the curated device knowledge pack was used
  | "online" // newer evidence was retrieved from an allow-listed source
  | "offline_fallback"; // online was unavailable; fell back to the pack

/** Population bucket used by the rules engine. */
export type AgeGroup =
  | "infant" // < 3 months (IMCI young infant)
  | "child" // 3 months – 5 years (IMCI child)
  | "adolescent" // 6 – 17 years
  | "adult" // 18 – 59 years
  | "older_adult" // >= 60 years
  | "unknown";

/** Structured facts collected from the conversation. */
export interface SymptomFacts {
  freeText: string;
  selectedSymptoms: string[];
  ageGroup: AgeGroup;
  ageYears?: number;
  pregnant?: boolean;
  durationDays?: number;
  rapidDeterioration?: boolean;
  allergies?: string;
  conditions?: string;
  currentMedicines?: string;
  /** Questions the patient could not answer; drives "insufficient" logic. */
  missingAnswers?: string[];
}

/** A grounded evidence reference shown to the user. */
export interface Citation {
  sourceId: string;
  title: string;
  publisher: string;
  canonicalUrl: string;
  publicationDate?: string;
  reviewDate?: string;
  version: string;
  section?: string;
  anchor?: string;
  /** Date the cited evidence snapshot was taken. */
  evidenceDate: string;
}

/** A red-flag warning sign the user should watch for. */
export interface WarningSign {
  label: string;
  action: string;
}

/** A rule that fired, recorded for transparency and audit. */
export interface TriggeredRule {
  ruleId: string;
  version: string;
  label: string;
  action: Urgency;
  immediateAction: string;
  triggerFacts: string[];
  requiresRmpValidation: true;
}

/**
 * The full assistant response. `retrievalCoverage` is a measure of *retrieval
 * quality* (how much of the query the knowledge pack could address), NEVER a
 * clinical probability, risk score, or confidence in a diagnosis.
 */
export interface Guidance {
  urgency: Urgency;
  immediateAction: string;
  explanation: string;
  safeSupportiveInformation: string;
  /** Defaults to "No medication has been prescribed." unless a signed order exists. */
  medicineStatus: string;
  warningSigns: WarningSign[];
  followUpWindow: string;
  questionsStillNeeded: string[];
  citations: Citation[];
  evidenceDate: string;
  knowledgeMode: KnowledgeMode;
  /** 0..1 retrieval coverage of the query's key topics; not a clinical score. */
  retrievalCoverage: number;
  triggeredRules: TriggeredRule[];
  /** India emergency number shown on red flags. */
  emergencyNumber: string;
  /** Nearest verified emergency facility, only if verified data exists. */
  emergencyFacility?: string;
  /** Clinician-review state for this guidance. */
  clinicianReviewState: "not_required" | "pending" | "approved";
  /** Plain-language limitation surfaced on every response. */
  limitation: string;
}

/** A single safe, citable passage from the curated knowledge pack. */
export interface KnowledgeChunk {
  chunkId: string;
  sourceId: string;
  section: string;
  anchor: string;
  text: string;
  /** Lower-cased keywords for deterministic lexical retrieval. */
  keywords: string[];
  population?: AgeGroup[];
}

/** Metadata recorded for every curated source in the pack. */
export interface KnowledgeSource {
  sourceId: string;
  title: string;
  publisher: string;
  canonicalUrl: string;
  publicationDate?: string;
  reviewDate?: string;
  jurisdiction: string;
  population?: AgeGroup[];
  licence: string;
  /** Content hash of the packed source, for staleness/integrity checks. */
  hash: string;
  version: string;
}
