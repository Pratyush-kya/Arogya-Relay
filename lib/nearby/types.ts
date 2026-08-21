/**
 * Shared types for the Nearby Care referral-navigation feature.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY. Every facility and camp shown is fictional
 * demonstration data. The feature must never claim live beds, current camps, or
 * ambulance dispatch unless an official, verified integration exists.
 */

export type FacilityType =
  | "hospital"
  | "phc" // Primary Health Centre
  | "chc" // Community Health Centre
  | "aam" // Ayushman Arogya Mandir
  | "clinic"
  | "pharmacy"
  | "government_service";

/** Clinical capabilities a facility may have. Used for capability-first ranking. */
export interface Capabilities {
  emergency: boolean;
  icu: boolean;
  oxygen: boolean;
  paediatrics: boolean;
  maternity: boolean;
  surgery: boolean;
  ambulance: boolean;
  pharmacy: boolean;
  mental_health: boolean;
  diagnostics: boolean;
}

export type VerificationStatus = "verified" | "unverified" | "stale" | "disputed";

export type GovernmentScheme = "ayushman" | "pmjay" | "state_nhm" | "abdm_hfr" | "none";

export interface Coordinates {
  lat: number;
  lng: number;
  /** Horizontal accuracy in metres (GPS). */
  accuracyMeters?: number;
  /** Capture time (ISO). */
  capturedAt?: string;
  /** 'gps' (precise-ish), 'manual' (pin/village/address/landmark), 'approximate'. */
  source?: "gps" | "manual" | "approximate";
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  coordinates: Coordinates;
  /** Human-readable address / village / landmark. */
  address: string;
  villageCode?: string;
  phone?: string;
  capabilities: Capabilities;
  schemes: GovernmentScheme[];
  /** Whether the facility is open (verified) right now. */
  openNow?: boolean;
  verification: VerificationStatus;
  verificationSource?: string;
  verifiedAt?: string;
  expiresAt?: string;
  externalId?: string;
  sourceUrl?: string;
  lastFetchedAt?: string;
}

export interface CampEvent {
  id: string;
  title: string;
  organiser: string;
  source: string;
  services: string[];
  eligibility?: string;
  start: string; // ISO
  end: string; // ISO
  /** Recurrence pattern, e.g. "weekly: Wednesday". */
  recurrence?: string;
  venue: string;
  coordinates: Coordinates;
  contact?: string;
  verification: VerificationStatus;
  lastVerifiedAt?: string;
  cancelled?: boolean;
  /** Validity window end (ISO); event hidden after this. */
  validityEnd: string;
}

export type LocationState =
  | "idle"
  | "acquiring"
  | "accurate"
  | "approximate"
  | "stale"
  | "denied"
  | "unavailable";

export interface LocationSnapshot extends Coordinates {
  state: LocationState;
  /** User-facing note shown for poor accuracy. */
  note?: string;
}

/** A single ranked referral result. */
export interface ReferralResult {
  facility: Facility;
  /** Straight-line distance in km (offline estimate). */
  straightLineKm: number;
  /** Road ETA in minutes, if a routing service returned it (online). */
  roadEtaMin?: number;
  roadDistanceKm?: number;
  /** Capability match score 0..1. */
  capabilityScore: number;
  /** Final blended score (capability-weighted, then proximity). */
  score: number;
  /** True if the facility has the required capability for the request. */
  capabilityMet: boolean;
  /** Why this facility was ranked here (explanation). */
  rationale: string;
}

export interface ReferralQuery {
  origin: Coordinates;
  /** Capabilities required for this patient (emergency, maternity, etc.). */
  requiredCapabilities: (keyof Capabilities)[];
  /** Preferred facility types (optional filter). */
  preferredTypes?: FacilityType[];
  schemesPreferred?: GovernmentScheme[];
  emergency?: boolean;
  child?: boolean;
  pregnancy?: boolean;
  /** When true, only facilities that meet ALL required capabilities are shown. */
  capabilityFirst?: boolean;
  /** Online routing available? */
  online?: boolean;
}

export type Language = "en" | "hi" | "or";

/** i18n-ready label bundle. Strings default to English; ready for hi/or. */
export const I18N: Record<string, Record<Language, string>> = {
  nearbyCare: { en: "Nearby Care", hi: "निकटतम देखभाल", or: "ନିକଟତମ ଚିକିତ୍ସା" },
  allowLocation: { en: "Allow location", hi: "ସ୍ଥାନ ଅନୁମତି ଦିଅନ୍ତୁ", or: "ଅବସ୍ଥିତି ଅନୁମତି ଦିଅନ୍ତୁ" },
  shareLocation: { en: "Share location", hi: "ସ୍ଥାନ ଅଂଶ କରନ୍ତୁ", or: "ଅବସ୍ଥିତି ଅଂଶ କରନ୍ତୁ" },
  call112: { en: "Call 112", hi: "112 କଲ୍ କରନ୍ତୁ", or: "112 କଲ୍ କରନ୍ତୁ" },
  map: { en: "Map", hi: "ମାନଚିତ୍ର", or: "ମାନଚିତ୍ର" },
  list: { en: "List", hi: "ସୂଚୀ", or: "ତାଲିକା" },
  accuracy: { en: "Accuracy", hi: "ନିର୍ଭୁଲତା", or: "ନିର୍ଭୁଲତା" },
  km: { en: "km", hi: "କି.ମି.", or: "କି.ମି." },
  callToConfirm: { en: "Call to confirm", hi: "ନିଶ୍ଚିତ କରିବାକୁ କଲ୍ କରନ୍ତୁ", or: "ନିଶ୍ଚିତ କରିବା ପାଇଁ କଲ୍ କର" },
  routeUnavailable: { en: "Road route unavailable — straight-line estimate only", hi: "ସଡକ ରୁଟ ଉପଲବ୍ଧ ନାହିଁ", or: "ସଡ଼କ ରୁଟ୍ ଉପଲବ୍ଧ ନାହିଁ" },
  staleData: { en: "Data may be out of date", hi: "ତଥ୍ୟ ପୁରୁଣା ହୋଇପାରେ", or: "ତଥ୍ୟ ପୁରୁଣା ହୋଇପାରେ" },
  synthetic: { en: "Demonstration data — not real facilities", hi: "ପ୍ରଦର୍ଶନ ତଥ୍ୟ — ବାସ୍ତବ ନୁହେଁ", or: "ପ୍ରଦର୍ଶନ ତଥ୍ୟ — ବାସ୍ତବ ନୁହେଁ" },
};
