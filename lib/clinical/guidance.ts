import { evaluate, mustEscalate } from "./engine.ts";
import { KNOWLEDGE_CHUNKS, SOURCE_MAP } from "./knowledge-pack.ts";
import type {
  Citation,
  Guidance,
  KnowledgeMode,
  SymptomFacts,
  Urgency,
  WarningSign,
} from "./types.ts";

/**
 * Deterministic, offline-first guidance assembly.
 *
 * This produces a complete, citable `Guidance` object WITHOUT any language
 * model. When a no-key local model is unavailable (or its output is invalid),
 * this is the safe fallback the prompt requires. The emergency verdict from
 * the rules engine is never downgraded by retrieval or generation.
 */

const INDIA_EMERGENCY_NUMBER = "112";

const URGENCY_PLAIN: Record<Urgency, string> = {
  emergency: "Emergency — act now",
  same_day: "Same-day clinician",
  clinician_review: "Scheduled clinical review",
  self_care_information: "Clinician-approved home-care information",
  insufficient_information: "Not enough information yet",
};

const URGENCY_EXPLANATION: Record<Urgency, string> = {
  emergency:
    "The information you provided matches a red-flag danger sign. This is a medical emergency and needs immediate help. Do not wait for a model, a map, or more information.",
  same_day:
    "The information suggests a problem that should be assessed by a clinician today. It is not a confirmed emergency, but delaying care is not advised.",
  clinician_review:
    "The information points to a symptom or change that a clinician should review. It does not look like an emergency right now.",
  self_care_information:
    "This looks like a low-risk symptom. Clinician-approved home-care information is provided. Watch for any worsening and seek care sooner if needed.",
  insufficient_information:
    "There is not enough information to suggest a safe next step. Please answer the missing questions so a safer recommendation can be made.",
};

const URGENCY_FOLLOWUP: Record<Urgency, string> = {
  emergency: "Now — call 112 or go to the nearest emergency facility immediately.",
  same_day: "Within the next few hours today — contact a clinician or facility.",
  clinician_review: "Within a few days — book a routine clinical review.",
  self_care_information: "Self-monitor for 24–48 hours; seek care sooner if symptoms change.",
  insufficient_information: "As soon as possible after you provide the missing details.",
};

/** Default warning signs shown for the relevant urgency band. */
function defaultWarningSigns(urgency: Urgency): WarningSign[] {
  switch (urgency) {
    case "emergency":
      return [
        { label: "Anything getting worse quickly", action: "Call 112 immediately." },
        { label: "Breathing, consciousness, or severe bleeding", action: "Call 112 immediately." },
      ];
    case "same_day":
      return [
        { label: "Fever rising or not improving", action: "Seek same-day care." },
        { label: "New breathing difficulty, rash, or confusion", action: "Treat as an emergency and call 112." },
      ];
    case "clinician_review":
      return [
        { label: "Symptoms lasting longer or getting worse", action: "Move to same-day or emergency care." },
        { label: "Any new danger sign", action: "Call 112." },
      ];
    case "self_care_information":
      return [
        { label: "Fever beyond 3 days, or any breathing difficulty", action: "Seek clinical care." },
        { label: "Symptom changes or new rash", action: "Contact a clinician." },
      ];
    default:
      return [{ label: "Any new or worsening symptom", action: "Provide more detail or seek care." }];
  }
}

/** Lexical retrieval over the curated pack (deterministic, no model). */
function retrieve(facts: SymptomFacts, limit = 4): { chunks: typeof KNOWLEDGE_CHUNKS; coverage: number } {
  const text = `${(facts.selectedSymptoms ?? []).join(" ")} ${facts.freeText} ${facts.pregnant ? "pregnant" : ""}`.toLowerCase();
  const tokens = Array.from(new Set(text.split(/[^a-z0-9]+/i).filter(Boolean)));

  const scored = KNOWLEDGE_CHUNKS.map((chunk) => {
    const hit = chunk.keywords.filter((k) => text.includes(k)).length;
    const popMatch = !chunk.population || !facts.ageGroup || chunk.population.includes(facts.ageGroup);
    return { chunk, score: hit + (popMatch ? 0.1 : 0) };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Retrieval COVERAGE is a measure of how well the pack addressed the query
  // topics — NEVER a clinical probability. We estimate it as the share of the
  // user's query tokens that matched a chunk keyword.
  const matchedTokens = new Set<string>();
  for (const { chunk } of scored) {
    for (const k of chunk.keywords) {
      if (text.includes(k)) matchedTokens.add(k);
    }
  }
  const coverage = tokens.length === 0 ? 0 : Math.min(1, matchedTokens.size / tokens.length);

  return { chunks: scored.map((s) => s.chunk), coverage };
}

function buildCitations(chunkIds: string[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const chunk of KNOWLEDGE_CHUNKS) {
    if (!chunkIds.includes(chunk.chunkId)) continue;
    const src = SOURCE_MAP[chunk.sourceId];
    if (!src || seen.has(src.sourceId)) continue;
    seen.add(src.sourceId);
    citations.push({
      sourceId: src.sourceId,
      title: src.title,
      publisher: src.publisher,
      canonicalUrl: src.canonicalUrl,
      publicationDate: src.publicationDate,
      reviewDate: src.reviewDate,
      version: src.version,
      section: chunk.section,
      anchor: chunk.anchor,
      evidenceDate: src.reviewDate ?? src.publicationDate ?? "unknown",
    });
  }
  return citations;
}

function chunkTextFor(chunkIds: string[]): string {
  return chunkIds
    .map((id) => KNOWLEDGE_CHUNKS.find((c) => c.chunkId === id)?.text)
    .filter(Boolean)
    .join(" ");
}

export interface AssembleOptions {
  knowledgeMode?: KnowledgeMode;
  /** Evidence retrieved online (de-identified concepts only), if any. */
  onlineEvidence?: Citation[];
  /** Safely overridden medicine status only when a signed order exists. */
  signedMedicineStatus?: string;
  emergencyFacility?: string;
  missingQuestions?: string[];
}

const LIMITATION =
  "Arogya Relay is a research prototype and does not diagnose, prescribe, or replace a clinician. All information here is clinician-approved guidance for screening support only.";

/**
 * Assemble a complete, safe `Guidance` object.
 *
 * The rules-engine verdict is computed first and can only be escalated, never
 * downgraded, by any later step (generation only attaches explanation text and
 * citations; it cannot change the urgency tier).
 */
export function assembleGuidance(facts: SymptomFacts, options: AssembleOptions = {}): Guidance {
  const engine = evaluate(facts);
  let urgency: Urgency = engine.urgency;

  const { chunks, coverage } = retrieve(facts);
  const chunkIds = chunks.map((c) => c.chunkId);

  // Online evidence can only ESCALATE urgency; it can never downgrade an
  // emergency result. (Deterministic emergency result is protected.)
  if (options.onlineEvidence && options.onlineEvidence.length > 0) {
    // Online evidence does not change a deterministic emergency verdict.
    if (urgency !== "emergency") {
      urgency = mustEscalate(urgency, "clinician_review");
    }
  }

  const citations = buildCitations(chunkIds).concat(options.onlineEvidence ?? []);
  const knowledgeMode: KnowledgeMode =
    options.knowledgeMode ?? (options.onlineEvidence ? "online" : "offline");

  const isEmergency = urgency === "emergency";
  const immediateAction = isEmergency
    ? engine.triggeredRules[0]?.immediateAction ??
      `Call ${INDIA_EMERGENCY_NUMBER} immediately or go to the nearest emergency facility.`
    : URGENCY_PLAIN[urgency];

  const warningSigns = defaultWarningSigns(urgency);

  const medicineStatus =
    options.signedMedicineStatus ?? "No medication has been prescribed.";

  const safeSupportiveInformation =
    chunkTextFor(chunkIds) ||
    "No matching passage was found in the offline knowledge pack for these details. Please provide more information or seek clinician advice.";

  const clinicianReviewState: Guidance["clinicianReviewState"] =
    urgency === "self_care_information" ? "pending" : urgency === "insufficient_information" ? "not_required" : "pending";

  const questionsStillNeeded =
    options.missingQuestions ??
    (urgency === "insufficient_information"
      ? facts.missingAnswers ?? ["age", "main symptom"]
      : []);

  return {
    urgency,
    immediateAction,
    explanation: URGENCY_EXPLANATION[urgency],
    safeSupportiveInformation,
    medicineStatus,
    warningSigns,
    followUpWindow: URGENCY_FOLLOWUP[urgency],
    questionsStillNeeded,
    citations,
    evidenceDate: new Date().toISOString().slice(0, 10),
    knowledgeMode,
    retrievalCoverage: Number(coverage.toFixed(2)),
    triggeredRules: engine.triggeredRules,
    emergencyNumber: INDIA_EMERGENCY_NUMBER,
    emergencyFacility: isEmergency ? options.emergencyFacility : undefined,
    clinicianReviewState,
    limitation: LIMITATION,
  };
}

export { URGENCY_PLAIN };
