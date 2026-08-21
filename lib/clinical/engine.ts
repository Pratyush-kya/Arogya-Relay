import type {
  AgeGroup,
  SymptomFacts,
  TriggeredRule,
  Urgency,
} from "./types.ts";

/**
 * Deterministic, versioned red-flag rules engine.
 *
 * This runs BEFORE any language model or vector search. Its verdict can only be
 * escalated, never downgraded, by downstream generation. Every rule is tagged
 * `requiresRmpValidation: true` because it must be reviewed by a Registered
 * Medical Practitioner (RMP) before real-patient use.
 *
 * Sources are national/WHO guidance (IMCI, WHO acute-care triage, MoHFW India,
 * India emergency number 112). Thresholds used are documented danger signs;
 * we do NOT invent numeric thresholds.
 */

const INDIA_EMERGENCY_NUMBER = "112";

interface Rule {
  ruleId: string;
  version: string;
  label: string;
  action: Exclude<Urgency, "insufficient_information">;
  immediateAction: string;
  /** Returns the trigger facts that fired, or null if the rule does not apply. */
  test: (f: SymptomFacts) => string[] | null;
  sourceId: string;
}

/** Normalise arbitrary user text for keyword detection. */
function haystack(f: SymptomFacts): string {
  return `${f.selectedSymptoms.join(" ")} ${f.freeText}`.toLowerCase();
}

function has(f: SymptomFacts, ...needles: string[]): boolean {
  const h = haystack(f);
  return needles.some((n) => h.includes(n));
}

function ageIn(f: SymptomFacts, group: AgeGroup): boolean {
  return f.ageGroup === group;
}

// ---------------------------------------------------------------------------
// EMERGENCY rules — evaluated first. Any hit forces `emergency`.
// ---------------------------------------------------------------------------
const EMERGENCY_RULES: Rule[] = [
  {
    ruleId: "RF-INFANT-FEVER",
    version: "2026.1",
    label: "Young infant (<3 months) with fever",
    action: "emergency",
    immediateAction:
      "Treat as a medical emergency. Take the infant to the nearest emergency facility now and call 112. Young infants with fever need urgent assessment.",
    sourceId: "WHO-IMCI-2005",
    test: (f) =>
      ageIn(f, "infant") && has(f, "fever", "high temperature", "temperature")
        ? ["ageGroup=infant", "fever present"]
        : null,
  },
  {
    ruleId: "RF-UNCONSCIOUS",
    version: "2026.1",
    label: "Unconsciousness or reduced consciousness",
    action: "emergency",
    immediateAction:
      "Call 112 immediately. Lay the person on their side, keep the airway open, and do not give anything by mouth.",
    sourceId: "WHO-EMT-2016",
    test: (f) =>
      has(f, "unconscious", "fainted", "fainting", "not responding", "unresponsive", "drowsy", "lethargic", "confused")
        ? ["consciousness reduced"]
        : null,
  },
  {
    ruleId: "RF-SEIZURE",
    version: "2026.1",
    label: "Convulsions / seizures",
    action: "emergency",
    immediateAction:
      "Call 112. Protect the person from injury, do not put anything in the mouth, and stay until help arrives.",
    sourceId: "WHO-IMCI-2005",
    test: (f) => (has(f, "seizure", "convulsion", "convuls", "fitting") ? ["seizure present"] : null),
  },
  {
    ruleId: "RF-BREATHING-EMERGENCY",
    version: "2026.1",
    label: "Severe breathing difficulty",
    action: "emergency",
    immediateAction:
      "Call 112 now. Severe breathing difficulty (struggling to breathe, blue lips, unable to speak in sentences) is an emergency.",
    sourceId: "WHO-IMCI-2005",
    test: (f) =>
      has(f, "cannot breathe", "struggling to breathe", "blue lips", "cyanosis", "central cyanosis", "severe chest indrawing", "stridor")
        ? ["severe breathing difficulty"]
        : null,
  },
  {
    ruleId: "RF-SEVERE-BLEEDING",
    version: "2026.1",
    label: "Severe or uncontrolled bleeding",
    action: "emergency",
    immediateAction:
      "Call 112. Apply firm pressure to the bleeding point with a clean cloth and keep pressure until help arrives.",
    sourceId: "WHO-EMT-2016",
    test: (f) =>
      has(f, "severe bleeding", "uncontrolled bleeding", "heavy bleeding", "bleeding heavily")
        ? ["severe bleeding"]
        : null,
  },
  {
    ruleId: "RF-CHEST-PAIN",
    version: "2026.1",
    label: "Central chest pain (possible cardiac)",
    action: "emergency",
    immediateAction:
      "Call 112 immediately. Sit the person down, keep them calm, and do not let them walk. Chest pain can be a heart emergency.",
    sourceId: "AHA-2020",
    test: (f) =>
      has(f, "chest pain", "crushing chest", "pressure in chest", "left arm pain with chest")
        ? ["cardiac-sounding chest pain"]
        : null,
  },
  {
    ruleId: "RF-MENINGITIS",
    version: "2026.1",
    label: "Stiff neck with fever",
    action: "emergency",
    immediateAction:
      "Call 112. A stiff neck with fever, especially with headache or rash, can be a medical emergency.",
    sourceId: "WHO-IMCI-2005",
    test: (f) =>
      has(f, "stiff neck") && has(f, "fever", "headache") ? ["stiff neck + fever"] : null,
  },
  {
    ruleId: "RF-PREG-ECLAMPSIA",
    version: "2026.1",
    label: "Pregnancy with danger signs (eclampsia)",
    action: "emergency",
    immediateAction:
      "Call 112. Pregnancy with severe headache, blurred vision, seizures, or severe upper-abdominal pain needs emergency care.",
    sourceId: "WHO-ANC-2016",
    test: (f) =>
      f.pregnant && has(f, "severe headache", "blurred vision", "seizure", "severe abdominal pain", "fits")
        ? ["pregnant", "eclampsia danger sign"]
        : null,
  },
  {
    ruleId: "RF-SELF-HARM",
    version: "2026.1",
    label: "Self-harm or suicide intent",
    action: "emergency",
    immediateAction:
      "Call 112 or the local emergency mental-health line now. Stay with the person and remove means of harm. You are not alone; help is available.",
    sourceId: "WHO-MH-GAP-2010",
    test: (f) =>
      has(f, "suicide", "kill myself", "end my life", "self harm", "self-harm", "harm myself")
        ? ["self-harm intent"]
        : null,
  },
  {
    ruleId: "RF-RAPID-DETERIORATION",
    version: "2026.1",
    label: "Rapid deterioration",
    action: "emergency",
    immediateAction:
      "Call 112. Rapid worsening of the person's condition is an emergency; seek help now.",
    sourceId: "WHO-EMT-2016",
    test: (f) => (f.rapidDeterioration ? ["rapid deterioration reported"] : null),
  },
  {
    ruleId: "RF-UNABLE-FLUIDS-CHILD",
    version: "2026.1",
    label: "Child unable to drink / keep fluids down (severe dehydration)",
    action: "emergency",
    immediateAction:
      "Call 112 or go to the nearest facility now. A child who cannot drink or is vomiting everything is an emergency.",
    sourceId: "WHO-IMCI-2005",
    test: (f) =>
      (ageIn(f, "infant") || ageIn(f, "child")) && has(f, "cannot drink", "vomiting everything", "not drinking", "won't breastfeed")
        ? ["child unable to retain fluids"]
        : null,
  },
];

// ---------------------------------------------------------------------------
// SAME-DAY rules — escalated if no emergency fired.
// ---------------------------------------------------------------------------
const SAME_DAY_RULES: Rule[] = [
  {
    ruleId: "RF-CHILD-HIGH-FEVER",
    version: "2026.1",
    label: "Child with high fever",
    action: "same_day",
    immediateAction:
      "See a clinician the same day. Children with high fever should be assessed promptly.",
    sourceId: "WHO-IMCI-2005",
    test: (f) =>
      (ageIn(f, "infant") || ageIn(f, "child")) && has(f, "fever", "high temperature")
        ? ["child", "fever"]
        : null,
  },
  {
    ruleId: "RF-PREG-FEVER",
    version: "2026.1",
    label: "Pregnancy with fever",
    action: "same_day",
    immediateAction:
      "Contact a clinician same day. Fever in pregnancy should be reviewed promptly.",
    sourceId: "WHO-ANC-2016",
    test: (f) => (f.pregnant && has(f, "fever", "high temperature") ? ["pregnant", "fever"] : null),
  },
  {
    ruleId: "RF-FEVER-3D-PLUS",
    version: "2026.1",
    label: "Fever for more than three days",
    action: "same_day",
    immediateAction:
      "Arrange a same-day clinician review. Fever lasting beyond three days needs assessment.",
    sourceId: "MoHFW-IDSP",
    test: (f) =>
      has(f, "fever", "high temperature") && typeof f.durationDays === "number" && f.durationDays > 3
        ? [`fever duration=${f.durationDays}d`]
        : null,
  },
  {
    ruleId: "RF-DEHYDRATION",
    version: "2026.1",
    label: "Signs of dehydration",
    action: "same_day",
    immediateAction:
      "Seek same-day care. Reduced urination, dry mouth, or dizziness on standing suggest dehydration.",
    sourceId: "WHO-IMCI-2005",
    test: (f) =>
      has(f, "dehydrated", "no urine", "dry mouth", "dizzy standing", "very thirsty", "sunken eyes")
        ? ["dehydration signs"]
        : null,
  },
  {
    ruleId: "RF-MENTAL-HEALTH-CRISIS",
    version: "2026.1",
    label: "Mental-health crisis without immediate intent",
    action: "same_day",
    immediateAction:
      "Contact a clinician or mental-health service today. Support is available and you do not have to manage this alone.",
    sourceId: "WHO-MH-GAP-2010",
    test: (f) =>
      has(f, "depressed", "panic", "anxious", "can't cope", "hearing voices", "overwhelmed")
        ? ["mental-health distress"]
        : null,
  },
  {
    ruleId: "RF-FRACTURE",
    version: "2026.1",
    label: "Possible fracture or major injury",
    action: "same_day",
    immediateAction:
      "Seek same-day assessment for a possible broken bone or significant injury.",
    sourceId: "WHO-EMT-2016",
    test: (f) =>
      has(f, "broken bone", "broken arm", "broken leg", "fracture", "deformed limb", "can't move arm", "can't move leg", "serious injury", "broken")
        ? ["possible fracture/injury"]
        : null,
  },
];

// ---------------------------------------------------------------------------
// CLINICIAN REVIEW / SELF-CARE — only if nothing above fired.
// ---------------------------------------------------------------------------
const REVIEW_RULES: Rule[] = [
  {
    ruleId: "RF-CHRONIC-FLARE",
    version: "2026.1",
    label: "Chronic condition with new or worsening symptoms",
    action: "clinician_review",
    immediateAction:
      "Book a clinical review. A change in a known chronic condition should be checked by a clinician.",
    sourceId: "MoHFW-NHP",
    test: (f) =>
      (f.conditions && f.conditions.trim().length > 0) && has(f, "worse", "new", "increased", "more")
        ? ["chronic condition", "worsening"]
        : null,
  },
  {
    ruleId: "RF-PERSISTENT-SYMPTOMS",
    version: "2026.1",
    label: "Persistent or unexplained symptoms",
    action: "clinician_review",
    immediateAction:
      "Arrange a routine clinical review to investigate ongoing symptoms.",
    sourceId: "MoHFW-NHP",
    test: (f) =>
      has(f, "cough", "pain", "rash", "fatigue", "fever", "headache") && typeof f.durationDays === "number" && f.durationDays >= 2
        ? [`symptom duration=${f.durationDays}d`]
        : null,
  },
];

const SELF_CARE_RULES: Rule[] = [
  {
    ruleId: "RF-MINOR-SELF-CARE",
    version: "2026.1",
    label: "Minor, low-risk symptom in an adult",
    action: "self_care_information",
    immediateAction:
      "Clinician-approved home-care information is provided below. Seek care sooner if anything worsens.",
    sourceId: "MoHFW-NHP",
    test: (f) => {
      if (f.ageGroup !== "adult" && f.ageGroup !== "adolescent") return null;
      if (
        has(f, "mild cold", "runny nose", "sore throat", "minor scrape", "small cut", "mild cough", "mild fever")
      ) {
        return ["low-risk adult/adolescent symptom"];
      }
      return null;
    },
  },
];

const ALL_RULES = [...EMERGENCY_RULES, ...SAME_DAY_RULES, ...REVIEW_RULES, ...SELF_CARE_RULES];

function toTriggeredRule(rule: Rule, facts: string[]): TriggeredRule {
  return {
    ruleId: rule.ruleId,
    version: rule.version,
    label: rule.label,
    action: rule.action,
    immediateAction: rule.immediateAction,
    triggerFacts: facts,
    requiresRmpValidation: true,
  };
}

const ESSENTIAL_MISSING_FOR_INSUFFICIENT = ["age", "main symptom"];

export interface EngineResult {
  urgency: Urgency;
  triggeredRules: TriggeredRule[];
  emergencyNumber: string;
}

/**
 * Evaluate the deterministic engine. Returns the most urgent action and the
 * rules that fired. This function is intentionally pure and side-effect free
 * so it can be unit-tested and reused on the server and client.
 */
export function evaluate(facts: SymptomFacts): EngineResult {
  const triggered: TriggeredRule[] = [];

  for (const rule of EMERGENCY_RULES) {
    const factsHit = rule.test(facts);
    if (factsHit) triggered.push(toTriggeredRule(rule, factsHit));
  }
  if (triggered.length > 0) {
    return { urgency: "emergency", triggeredRules: triggered, emergencyNumber: INDIA_EMERGENCY_NUMBER };
  }

  for (const rule of SAME_DAY_RULES) {
    const factsHit = rule.test(facts);
    if (factsHit) triggered.push(toTriggeredRule(rule, factsHit));
  }
  if (triggered.length > 0) {
    return { urgency: "same_day", triggeredRules: triggered, emergencyNumber: INDIA_EMERGENCY_NUMBER };
  }

  for (const rule of REVIEW_RULES) {
    const factsHit = rule.test(facts);
    if (factsHit) triggered.push(toTriggeredRule(rule, factsHit));
  }
  if (triggered.length > 0) {
    return { urgency: "clinician_review", triggeredRules: triggered, emergencyNumber: INDIA_EMERGENCY_NUMBER };
  }

  for (const rule of SELF_CARE_RULES) {
    const factsHit = rule.test(facts);
    if (factsHit) triggered.push(toTriggeredRule(rule, factsHit));
  }
  if (triggered.length > 0) {
    return { urgency: "self_care_information", triggeredRules: triggered, emergencyNumber: INDIA_EMERGENCY_NUMBER };
  }

  // No rule fired: decide between insufficient information and a soft review.
  const missing = facts.missingAnswers ?? [];
  const needsMore = ESSENTIAL_MISSING_FOR_INSUFFICIENT.some((m) =>
    missing.some((x) => x.toLowerCase().includes(m.toLowerCase())),
  );
  if (needsMore || missing.length > 0) {
    return { urgency: "insufficient_information", triggeredRules: [], emergencyNumber: INDIA_EMERGENCY_NUMBER };
  }

  return { urgency: "clinician_review", triggeredRules: [], emergencyNumber: INDIA_EMERGENCY_NUMBER };
}

/** Emergency verdicts must never be downgraded by any later step. */
export function mustEscalate(current: Urgency, candidate: Urgency): Urgency {
  const order: Urgency[] = [
    "insufficient_information",
    "self_care_information",
    "clinician_review",
    "same_day",
    "emergency",
  ];
  return order.indexOf(candidate) > order.indexOf(current) ? candidate : current;
}

export { ALL_RULES };
